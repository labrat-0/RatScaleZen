// RatForge - Icon Toolkit by ratbyte.dev
// All features in one file for Firefox extension CSP compliance

const SIZE_RULES = {
  android: [48, 72, 96, 144, 192, 512],
  ios: [40, 58, 60, 80, 87, 120, 180, 1024],
  windows: [16, 32, 44, 48, 50, 150, 310],
  macos: [16, 32, 64, 128, 256, 512, 1024],
  chrome: [16, 32, 48, 128],
  firefox: [16, 32, 48, 64, 128],
  pwa: [48, 72, 96, 144, 168, 192, 512]
};

const VALID_IMAGE_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'];

// Platforms that generally don't support transparency
const NO_TRANSPARENCY_PLATFORMS = ['ios', 'windows'];

let selectedFile = null;
let isProcessing = false;
let selectedPlatforms = ['chrome'];
let customSizes = [];
let currentShape = 'none';
let loadedImage = null;
let loadedImageUrl = null;

// Saved presets in storage
let savedPresets = {};

function detectBrowser() {
  var ua = navigator.userAgent.toLowerCase();
  if (ua.indexOf('firefox') > -1) return 'firefox';
  if (ua.indexOf('edge') > -1 || ua.indexOf('edg/') > -1) return 'edge';
  if (ua.indexOf('chrome') > -1) return 'chrome';
  if (ua.indexOf('safari') > -1) return 'safari';
  return 'unknown';
}
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
}

var currentBrowser = detectBrowser();
var isMobile = isMobileDevice();

// Init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  setTimeout(initApp, 10);
}
window.addEventListener('load', function() {
  if (!window.rfInitialized) initApp();
});

function initApp() {
  if (window.rfInitialized) return;
  window.rfInitialized = true;

  var dropArea = document.getElementById('dropArea');
  var fileName = document.getElementById('fileName');
  var resizeButton = document.getElementById('resizeButton');
  var progressBar = document.getElementById('progressBar');
  var statusEl = document.getElementById('status');
  var mobileUpload = document.getElementById('mobileUpload');
  var mobileGalleryBtn = document.getElementById('mobileGalleryBtn');

  if (!dropArea) return;

  // Load saved presets from storage
  loadPresets();

  // Section collapse toggle
  var headers = document.querySelectorAll('.section-header');
  for (var i = 0; i < headers.length; i++) {
    headers[i].addEventListener('click', function() {
      this.classList.toggle('collapsed');
    });
  }

  // Platform selector
  setupPlatformSelector();

  // Custom sizes
  setupCustomSizes();

  // Preset profiles
  setupPresets();

  // Transform options
  setupTransformOptions();

  // Format options (no extra setup needed, checkboxes are in HTML)

  // Preview background toggle
  setupPreviewBgToggle();

  // Favicon options
  setupFaviconOptions();

  // Export extras
  setupExportExtras();

  // Shape buttons
  setupShapeButtons();

  // File input
  setupInputMethods();

  // Resize button
  if (resizeButton) {
    resizeButton.addEventListener('click', startProcessing);
  }

  // --- Helpers ---

  function updateStatus(msg, color) {
    if (statusEl) {
      statusEl.textContent = msg;
      if (color) statusEl.style.color = color;
    }
  }
  function updateProgress(pct) {
    if (progressBar) progressBar.style.width = pct + '%';
  }

  // --- File input ---
  function setupInputMethods() {
    // Drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(ev) {
      dropArea.addEventListener(ev, function(e) { e.preventDefault(); e.stopPropagation(); }, false);
    });
    ['dragenter', 'dragover'].forEach(function(ev) {
      dropArea.addEventListener(ev, function() { dropArea.classList.add('dragging'); }, false);
    });
    ['dragleave', 'drop'].forEach(function(ev) {
      dropArea.addEventListener(ev, function() { dropArea.classList.remove('dragging'); }, false);
    });
    dropArea.addEventListener('drop', function(e) {
      var dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        var file = dt.files[0];
        if (isValidFormat(file)) handleFileSelection(file);
        else updateStatus('Invalid format. Use PNG, JPG, WebP, GIF, SVG.', '#ff5555');
      }
    }, false);
    // Mobile
    if (mobileUpload) {
      mobileUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files.length > 0) {
          var f = e.target.files[0];
          if (isValidFormat(f)) handleFileSelection(f);
          else updateStatus('Invalid format.', '#ff5555');
        }
      });
    }
    if (mobileGalleryBtn) {
      mobileGalleryBtn.addEventListener('click', function() {
        if (mobileUpload) mobileUpload.click();
      });
    }
  }

  function isValidFormat(f) { return f && VALID_IMAGE_FORMATS.indexOf(f.type) !== -1; }

  function handleFileSelection(file) {
    if (!file || !isValidFormat(file)) {
      updateStatus('Invalid image format.', '#ff5555');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      updateStatus('File too large. Maximum 5MB.', '#ff5555');
      return;
    }
    selectedFile = file;
    if (fileName) {
      var mb = (file.size / (1024 * 1024)).toFixed(1);
      fileName.textContent = file.name + ' (' + mb + ' MB)';
    }
    if (resizeButton) resizeButton.disabled = false;
    updateStatus('Ready to generate icon pack', '#ff9999');

    // Load image for analysis and preview
    if (loadedImageUrl) URL.revokeObjectURL(loadedImageUrl);
    loadedImageUrl = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function() {
      loadedImage = img;
      showImageInfo(img, file);
      checkDownscaleWarning(img);
      checkTransparencyWarning(file, img);
      extractColorPalette(img);
      updateLivePreview();
      updateContextPreview();
    };
    img.onerror = function() {
      updateStatus('Error loading image.', '#ff5555');
    };
    img.src = loadedImageUrl;
  }

  // --- Image Info ---
  function showImageInfo(img, file) {
    var el = document.getElementById('imageInfo');
    if (!el) return;
    el.textContent = img.naturalWidth + 'x' + img.naturalHeight + 'px | ' + file.type.replace('image/', '').toUpperCase();
    el.classList.add('active');
  }

  // --- Smart Downscale Warning ---
  function checkDownscaleWarning(img) {
    var el = document.getElementById('downscaleWarning');
    if (!el) return;
    var maxNeeded = getMaxTargetSize();
    if (img.naturalWidth < maxNeeded || img.naturalHeight < maxNeeded) {
      el.textContent = 'Source image (' + img.naturalWidth + 'x' + img.naturalHeight +
        ') is smaller than largest target (' + maxNeeded + 'x' + maxNeeded +
        '). Upscaling will reduce quality.';
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }

  function getMaxTargetSize() {
    var sizes = getUniqueSizes();
    return sizes.length > 0 ? sizes[sizes.length - 1] : 1024;
  }

  // --- Transparency Detection ---
  function checkTransparencyWarning(file, img) {
    var el = document.getElementById('transparencyWarning');
    if (!el) return;
    // Only check PNG / WebP (formats that support transparency)
    if (file.type !== 'image/png' && file.type !== 'image/webp') {
      el.classList.remove('active');
      return;
    }
    // Sample the image for transparent pixels
    var canvas = document.createElement('canvas');
    var sz = Math.min(img.naturalWidth, img.naturalHeight, 100);
    canvas.width = sz;
    canvas.height = sz;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, sz, sz);
    var data = ctx.getImageData(0, 0, sz, sz).data;
    var hasTransparency = false;
    for (var i = 3; i < data.length; i += 4) {
      if (data[i] < 250) { hasTransparency = true; break; }
    }
    if (hasTransparency) {
      // Check if any selected platform doesn't support it
      var badPlatforms = [];
      for (var p = 0; p < selectedPlatforms.length; p++) {
        if (NO_TRANSPARENCY_PLATFORMS.indexOf(selectedPlatforms[p]) !== -1) {
          badPlatforms.push(selectedPlatforms[p]);
        }
      }
      if (badPlatforms.length > 0) {
        el.textContent = 'Image has transparency. ' + badPlatforms.join(', ') +
          ' may not display it correctly. Consider adding a background color.';
        el.classList.add('active');
        el.classList.add('error-box');
      } else {
        el.textContent = 'Image has transparent areas.';
        el.classList.add('active');
        el.classList.remove('error-box');
      }
    } else {
      el.classList.remove('active');
    }
  }

  // --- Color Palette Extraction ---
  function extractColorPalette(img) {
    var paletteEl = document.getElementById('colorPalette');
    var infoEl = document.getElementById('colorPaletteInfo');
    if (!paletteEl) return;
    paletteEl.innerHTML = '';
    if (infoEl) infoEl.textContent = 'Extracting...';

    var canvas = document.createElement('canvas');
    var sz = 64;
    canvas.width = sz;
    canvas.height = sz;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, sz, sz);
    var data = ctx.getImageData(0, 0, sz, sz).data;

    // Simple k-means-ish: bucket colors
    var buckets = {};
    for (var i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue; // skip transparent
      // Quantize to reduce
      var r = Math.round(data[i] / 32) * 32;
      var g = Math.round(data[i + 1] / 32) * 32;
      var b = Math.round(data[i + 2] / 32) * 32;
      var key = r + ',' + g + ',' + b;
      buckets[key] = (buckets[key] || 0) + 1;
    }
    // Sort by frequency
    var sorted = Object.keys(buckets).sort(function(a, b) { return buckets[b] - buckets[a]; });
    var topColors = sorted.slice(0, 8).map(function(k) {
      var parts = k.split(',');
      return { r: +parts[0], g: +parts[1], b: +parts[2] };
    });

    if (infoEl) infoEl.textContent = topColors.length + ' dominant colors (click to copy)';

    topColors.forEach(function(c) {
      var hex = '#' + ((1 << 24) + (c.r << 16) + (c.g << 8) + c.b).toString(16).slice(1);
      var swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.title = hex + ' / rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
      var swatchBox = document.createElement('div');
      swatchBox.className = 'color-swatch-box';
      swatchBox.style.background = hex;
      var swatchLabel = document.createElement('span');
      swatchLabel.className = 'color-swatch-label';
      swatchLabel.textContent = hex;
      swatch.appendChild(swatchBox);
      swatch.appendChild(swatchLabel);
      swatch.addEventListener('click', function() {
        copyToClipboard(hex);
        var lbl = swatch.querySelector('.color-swatch-label');
        lbl.textContent = 'copied!';
        swatch.classList.add('copied');
        setTimeout(function() { lbl.textContent = hex; swatch.classList.remove('copied'); }, 1200);
      });
      paletteEl.appendChild(swatch);
    });
  }

  // --- Platform Selector ---
  function setupPlatformSelector() {
    var container = document.getElementById('platformSelector');
    if (!container) return;
    container.innerHTML = '';

    // Select All
    var selectAllLabel = document.createElement('label');
    selectAllLabel.className = 'platform-option select-all';
    var selectAllCb = document.createElement('input');
    selectAllCb.type = 'checkbox';
    selectAllCb.id = 'selectAllPlatforms';
    selectAllCb.className = 'platform-checkbox';
    var allKeys = Object.keys(SIZE_RULES);
    selectAllCb.checked = allKeys.length === selectedPlatforms.length && allKeys.every(function(p) { return selectedPlatforms.indexOf(p) !== -1; });
    selectAllCb.addEventListener('change', function() {
      var cbs = document.querySelectorAll('.plat-cb');
      if (selectAllCb.checked) {
        selectedPlatforms = allKeys.slice();
        for (var i = 0; i < cbs.length; i++) cbs[i].checked = true;
      } else {
        selectedPlatforms = [];
        for (var i = 0; i < cbs.length; i++) cbs[i].checked = false;
      }
      onPlatformChange();
    });
    var allText = document.createElement('span');
    allText.textContent = 'Select All Platforms';
    allText.style.fontWeight = 'bold';
    var totalSizes = new Set(Object.values(SIZE_RULES).reduce(function(a, b) { return a.concat(b); }, [])).size;
    var totalBadge = document.createElement('span');
    totalBadge.className = 'size-count';
    totalBadge.textContent = totalSizes + ' sizes';
    selectAllLabel.appendChild(selectAllCb);
    selectAllLabel.appendChild(allText);
    selectAllLabel.appendChild(totalBadge);
    container.appendChild(selectAllLabel);

    // Grid
    var grid = document.createElement('div');
    grid.className = 'platform-grid';
    allKeys.forEach(function(platform) {
      var label = document.createElement('label');
      label.className = 'platform-option';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = platform;
      cb.checked = selectedPlatforms.indexOf(platform) !== -1;
      cb.className = 'platform-checkbox plat-cb';
      cb.addEventListener('change', function() {
        if (cb.checked) { selectedPlatforms.push(platform); }
        else { selectedPlatforms = selectedPlatforms.filter(function(p) { return p !== platform; }); }
        selectAllCb.checked = allKeys.every(function(p) { return selectedPlatforms.indexOf(p) !== -1; });
        onPlatformChange();
      });
      var iconWrap = document.createElement('div');
      iconWrap.className = 'platform-icon';
      var icon = document.createElement('img');
      icon.src = 'platform_icons/' + platform + '.svg';
      icon.alt = platform;
      icon.width = 16;
      icon.height = 16;
      iconWrap.appendChild(icon);
      var name = document.createElement('span');
      name.className = 'platform-name';
      name.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);
      var badge = document.createElement('span');
      badge.className = 'size-count';
      badge.textContent = SIZE_RULES[platform].length;
      label.appendChild(cb);
      label.appendChild(iconWrap);
      label.appendChild(name);
      label.appendChild(badge);
      grid.appendChild(label);
    });
    container.appendChild(grid);
  }

  function onPlatformChange() {
    if (loadedImage) {
      checkDownscaleWarning(loadedImage);
      checkTransparencyWarning(selectedFile, loadedImage);
      updateLivePreview();
    }
  }

  // --- Custom Sizes ---
  function setupCustomSizes() {
    var input = document.getElementById('customSizeInput');
    var addBtn = document.getElementById('addCustomSize');
    var listEl = document.getElementById('customSizesList');
    if (!addBtn || !input || !listEl) return;

    addBtn.addEventListener('click', function() {
      var val = parseInt(input.value, 10);
      if (!val || val < 1 || val > 4096) return;
      if (customSizes.indexOf(val) !== -1) return;
      customSizes.push(val);
      customSizes.sort(function(a, b) { return a - b; });
      input.value = '';
      renderCustomSizes();
      if (loadedImage) updateLivePreview();
    });
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') addBtn.click();
    });

    function renderCustomSizes() {
      listEl.innerHTML = '';
      customSizes.forEach(function(sz) {
        var tag = document.createElement('span');
        tag.className = 'custom-size-tag';
        tag.textContent = sz + 'px';
        var rm = document.createElement('span');
        rm.className = 'remove-tag';
        rm.textContent = 'x';
        rm.addEventListener('click', function() {
          customSizes = customSizes.filter(function(s) { return s !== sz; });
          renderCustomSizes();
          if (loadedImage) updateLivePreview();
        });
        tag.appendChild(rm);
        listEl.appendChild(tag);
      });
    }
  }

  // --- Preset Profiles ---
  function setupPresets() {
    var applyBtn = document.getElementById('applyPreset');
    var saveBtn = document.getElementById('savePreset');
    var presetSelect = document.getElementById('presetSelect');
    if (!applyBtn || !saveBtn || !presetSelect) return;

    applyBtn.addEventListener('click', function() {
      var val = presetSelect.value;
      if (!val) return;
      // Built-in presets
      var builtIn = {
        web: ['chrome', 'firefox', 'pwa'],
        mobile: ['android', 'ios'],
        desktop: ['windows', 'macos'],
        all: Object.keys(SIZE_RULES)
      };
      var platforms = builtIn[val] || (savedPresets[val] ? savedPresets[val].platforms : null);
      if (!platforms) return;
      selectedPlatforms = platforms.slice();
      var customFromPreset = savedPresets[val] ? savedPresets[val].customSizes || [] : [];
      customSizes = customFromPreset.slice();
      setupPlatformSelector();
      // Re-render custom sizes
      var listEl = document.getElementById('customSizesList');
      if (listEl) {
        listEl.innerHTML = '';
        customSizes.forEach(function(sz) {
          var tag = document.createElement('span');
          tag.className = 'custom-size-tag';
          tag.textContent = sz + 'px';
          var rm = document.createElement('span');
          rm.className = 'remove-tag';
          rm.textContent = 'x';
          rm.addEventListener('click', function() {
            customSizes = customSizes.filter(function(s) { return s !== sz; });
            tag.remove();
            if (loadedImage) updateLivePreview();
          });
          tag.appendChild(rm);
          listEl.appendChild(tag);
        });
      }
      onPlatformChange();
    });

    saveBtn.addEventListener('click', function() {
      var nameInput = document.getElementById('presetName');
      var name = nameInput ? nameInput.value.trim() : '';
      if (!name) return;
      savedPresets[name] = { platforms: selectedPlatforms.slice(), customSizes: customSizes.slice() };
      savePresetsToStorage();
      // Add to select
      var existing = presetSelect.querySelector('option[value="' + name + '"]');
      if (!existing) {
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        presetSelect.appendChild(opt);
      }
      if (nameInput) nameInput.value = '';
    });
  }

  function loadPresets() {
    try {
      if (typeof browser !== 'undefined' && browser.storage) {
        browser.storage.local.get('ratforgePresets').then(function(data) {
          if (data.ratforgePresets) {
            savedPresets = data.ratforgePresets;
            var presetSelect = document.getElementById('presetSelect');
            if (presetSelect) {
              Object.keys(savedPresets).forEach(function(name) {
                var opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                presetSelect.appendChild(opt);
              });
            }
          }
        });
      }
    } catch (e) { /* ignore */ }
  }
  function savePresetsToStorage() {
    try {
      if (typeof browser !== 'undefined' && browser.storage) {
        browser.storage.local.set({ ratforgePresets: savedPresets });
      }
    } catch (e) { /* ignore */ }
  }

  // --- Transform Options ---
  function setupTransformOptions() {
    var bgMode = document.getElementById('bgMode');
    var bgColor = document.getElementById('bgColor');
    var paddingRange = document.getElementById('paddingRange');
    var paddingValue = document.getElementById('paddingValue');

    if (bgMode && bgColor) {
      bgMode.addEventListener('change', function() {
        bgColor.style.display = bgMode.value === 'color' ? 'inline-block' : 'none';
        if (loadedImage) updateLivePreview();
      });
      bgColor.addEventListener('input', function() {
        if (loadedImage) updateLivePreview();
      });
    }
    if (paddingRange && paddingValue) {
      paddingRange.addEventListener('input', function() {
        paddingValue.textContent = paddingRange.value + '%';
        if (loadedImage) updateLivePreview();
      });
    }
  }

  // --- Shape Buttons ---
  function setupShapeButtons() {
    var btns = document.querySelectorAll('.shape-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function() {
        for (var j = 0; j < btns.length; j++) btns[j].classList.remove('active');
        this.classList.add('active');
        currentShape = this.getAttribute('data-shape');
        if (loadedImage) updateLivePreview();
        if (loadedImage) updateContextPreview();
      });
    }
  }

  // --- Preview Background Toggle ---
  function setupPreviewBgToggle() {
    var btns = document.querySelectorAll('.preview-bg-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function() {
        for (var j = 0; j < btns.length; j++) btns[j].classList.remove('active');
        this.classList.add('active');
        var grid = document.getElementById('previewGrid');
        if (grid) {
          if (this.getAttribute('data-bg') === 'light') grid.classList.add('light-mode');
          else grid.classList.remove('light-mode');
        }
      });
    }
  }

  // --- Favicon Options ---
  function setupFaviconOptions() {
    var htmlCb = document.getElementById('includeFaviconHtml');
    var output = document.getElementById('faviconHtmlOutput');
    if (htmlCb && output) {
      htmlCb.addEventListener('change', function() {
        if (htmlCb.checked) {
          var tags = '<link rel="icon" type="image/x-icon" href="/favicon.ico">\n' +
            '<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon_32x32.png">\n' +
            '<link rel="icon" type="image/png" sizes="16x16" href="/icons/icon_16x16.png">\n' +
            '<link rel="apple-touch-icon" sizes="180x180" href="/icons/icon_180x180.png">';
          output.textContent = tags;
          output.classList.add('active');
        } else {
          output.classList.remove('active');
        }
      });
    }
  }

  // --- Export Extras ---
  function setupExportExtras() {
    var previewBtn = document.getElementById('previewManifest');
    var manifestOutput = document.getElementById('manifestOutput');
    var manifestType = document.getElementById('manifestType');
    if (previewBtn && manifestOutput && manifestType) {
      previewBtn.addEventListener('click', function() {
        var type = manifestType.value;
        var sizes = getUniqueSizes();
        var content = '';
        if (type === 'pwa') {
          var icons = sizes.map(function(s) {
            return '    { "src": "/icons/icon_' + s + 'x' + s + '.png", "sizes": "' + s + 'x' + s + '", "type": "image/png" }';
          });
          content = '{\n  "icons": [\n' + icons.join(',\n') + '\n  ]\n}';
        } else if (type === 'extension') {
          var obj = {};
          sizes.forEach(function(s) { obj[s] = 'icons/icon_' + s + 'x' + s + '.png'; });
          content = '{\n  "icons": ' + JSON.stringify(obj, null, 4) + '\n}';
        } else if (type === 'xcode') {
          var images = sizes.map(function(s) {
            return '    {\n      "filename": "icon_' + s + 'x' + s + '.png",\n      "idiom": "universal",\n      "platform": "ios",\n      "size": "' + s + 'x' + s + '"\n    }';
          });
          content = '{\n  "images": [\n' + images.join(',\n') + '\n  ],\n  "info": { "author": "RatForge", "version": 1 }\n}';
        }
        manifestOutput.textContent = content;
        manifestOutput.classList.add('active');
      });
    }
  }

  // --- Live Preview ---
  function updateLivePreview() {
    var grid = document.getElementById('previewGrid');
    if (!grid || !loadedImage) return;
    grid.innerHTML = '';
    var sizes = getUniqueSizes();
    // Show at most 12 sizes in preview
    var previewSizes = sizes;
    if (sizes.length > 12) {
      var step = Math.ceil(sizes.length / 12);
      previewSizes = [];
      for (var i = 0; i < sizes.length; i += step) previewSizes.push(sizes[i]);
      if (previewSizes[previewSizes.length - 1] !== sizes[sizes.length - 1]) previewSizes.push(sizes[sizes.length - 1]);
    }
    previewSizes.forEach(function(sz) {
      var item = document.createElement('div');
      item.className = 'preview-item';
      var canvas = renderIcon(loadedImage, sz);
      var img = document.createElement('img');
      img.src = canvas.toDataURL('image/png');
      var displaySz = Math.min(64, sz);
      img.style.width = displaySz + 'px';
      img.style.height = displaySz + 'px';
      if (sz < 48) img.style.border = '1px dashed rgba(255,255,255,0.2)';
      var label = document.createElement('span');
      label.className = 'preview-label';
      label.textContent = sz + 'x' + sz;
      // Platform badges
      var badges = document.createElement('div');
      badges.className = 'preview-badges';
      Object.keys(SIZE_RULES).forEach(function(p) {
        if (selectedPlatforms.indexOf(p) !== -1 && SIZE_RULES[p].indexOf(sz) !== -1) {
          var b = document.createElement('span');
          b.className = 'preview-badge';
          b.textContent = p.charAt(0).toUpperCase();
          b.title = p;
          badges.appendChild(b);
        }
      });
      item.appendChild(img);
      item.appendChild(label);
      item.appendChild(badges);
      grid.appendChild(item);
    });
    if (previewSizes.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.cssText = 'font-size:12px;color:var(--text-muted);grid-column:1/-1;text-align:center;padding:var(--space-md)';
      emptyMsg.textContent = 'Select at least one platform';
      grid.innerHTML = '';
      grid.appendChild(emptyMsg);
    }
  }

  // --- Context Preview ---
  function updateContextPreview() {
    if (!loadedImage) return;
    // Browser tab - 16x16
    var tabCanvas = renderIcon(loadedImage, 16);
    var tabEl = document.getElementById('ctxBrowserTab');
    if (tabEl) {
      tabEl.innerHTML = '';
      var tabImg = document.createElement('img');
      tabImg.src = tabCanvas.toDataURL('image/png');
      tabImg.style.width = '16px';
      tabImg.style.height = '16px';
      var tabTitle = document.createElement('span');
      tabTitle.textContent = selectedFile ? selectedFile.name.split('.')[0] : 'My App';
      tabEl.appendChild(tabImg);
      tabEl.appendChild(tabTitle);
    }
    // Homescreen - 48x48 (displayed)
    var homeCanvas = renderIcon(loadedImage, 120);
    var homeEl = document.getElementById('ctxHomescreen');
    if (homeEl) {
      homeEl.innerHTML = '';
      var homeImg = document.createElement('img');
      homeImg.src = homeCanvas.toDataURL('image/png');
      homeImg.style.width = '48px';
      homeImg.style.height = '48px';
      homeImg.style.borderRadius = '12px';
      var homeLabel = document.createElement('span');
      homeLabel.textContent = selectedFile ? selectedFile.name.split('.')[0].substring(0, 10) : 'App';
      homeEl.appendChild(homeImg);
      homeEl.appendChild(homeLabel);
    }
    // Taskbar - 24x24
    var taskCanvas = renderIcon(loadedImage, 32);
    var taskEl = document.getElementById('ctxTaskbar');
    if (taskEl) {
      taskEl.innerHTML = '';
      var taskImg = document.createElement('img');
      taskImg.src = taskCanvas.toDataURL('image/png');
      taskImg.style.width = '24px';
      taskImg.style.height = '24px';
      taskEl.appendChild(taskImg);
    }
  }

  // --- Render Icon with transforms ---
  function renderIcon(img, size) {
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    var bgMode = document.getElementById('bgMode');
    var bgColor = document.getElementById('bgColor');
    var paddingRange = document.getElementById('paddingRange');
    var padding = paddingRange ? parseInt(paddingRange.value, 10) : 0;
    var padPx = Math.round(size * padding / 100);

    // Background
    if (bgMode && bgMode.value === 'color' && bgColor) {
      ctx.fillStyle = bgColor.value;
      ctx.fillRect(0, 0, size, size);
    }

    // Shape mask
    if (currentShape !== 'none') {
      ctx.save();
      ctx.beginPath();
      if (currentShape === 'circle') {
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      } else if (currentShape === 'rounded') {
        var r = size * 0.18;
        roundRect(ctx, 0, 0, size, size, r);
      } else if (currentShape === 'squircle') {
        drawSquircle(ctx, 0, 0, size, size);
      }
      ctx.clip();
      // Fill background inside clip if color mode
      if (bgMode && bgMode.value === 'color' && bgColor) {
        ctx.fillStyle = bgColor.value;
        ctx.fillRect(0, 0, size, size);
      }
    }

    ctx.drawImage(img, padPx, padPx, size - padPx * 2, size - padPx * 2);

    if (currentShape !== 'none') {
      ctx.restore();
    }
    return canvas;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawSquircle(ctx, x, y, w, h) {
    var n = 4;
    var steps = 200;
    var cx = x + w / 2;
    var cy = y + h / 2;
    var a = w / 2;
    var b = h / 2;
    ctx.moveTo(cx + a, cy);
    for (var i = 1; i <= steps; i++) {
      var t = (i / steps) * 2 * Math.PI;
      var cosT = Math.cos(t);
      var sinT = Math.sin(t);
      var px = a * Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / n) + cx;
      var py = b * Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / n) + cy;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // --- Get unique sizes ---
  function getUniqueSizes() {
    var allSizes = [];
    selectedPlatforms.forEach(function(p) {
      if (SIZE_RULES[p]) allSizes = allSizes.concat(SIZE_RULES[p]);
    });
    allSizes = allSizes.concat(customSizes);
    var unique = [];
    var seen = {};
    allSizes.forEach(function(s) {
      if (!seen[s]) { seen[s] = true; unique.push(s); }
    });
    unique.sort(function(a, b) { return a - b; });
    return unique;
  }

  // --- Processing ---
  function startProcessing() {
    if (!selectedFile || isProcessing) return;
    if (selectedPlatforms.length === 0 && customSizes.length === 0) {
      updateStatus('Select at least one platform or add a custom size.', '#ffaa66');
      return;
    }
    processImage();
  }

  function processImage() {
    if (!selectedFile || isProcessing) return;
    isProcessing = true;
    if (resizeButton) resizeButton.disabled = true;
    updateStatus('Processing...', '#ffaa66');
    updateProgress(5);
    var sizesToProcess = getUniqueSizes();

    var objectUrl = URL.createObjectURL(selectedFile);
    var img = new Image();
    img.onload = function() {
      processSizesInBatches(img, sizesToProcess);
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = function() {
      updateStatus('Error loading image.', '#ff5555');
      isProcessing = false;
      if (resizeButton) resizeButton.disabled = false;
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  }

  function processSizesInBatches(img, sizes) {
    var baseName = selectedFile.name.split('.')[0] || 'icon';
    var folderName = baseName + '_icons';
    var results = [];
    var processedCount = 0;
    var batchSize = 5;

    // Determine which output formats are selected
    var outputPng = document.getElementById('fmtPng') && document.getElementById('fmtPng').checked;
    var outputWebp = document.getElementById('fmtWebp') && document.getElementById('fmtWebp').checked;
    var outputIco = document.getElementById('fmtIco') && document.getElementById('fmtIco').checked;
    if (!outputPng && !outputWebp && !outputIco) outputPng = true; // fallback

    function processNext(startIdx) {
      if (startIdx >= sizes.length) {
        createZipFile(results, folderName, img, sizes, outputPng, outputWebp, outputIco);
        return;
      }
      var end = Math.min(startIdx + batchSize, sizes.length);
      var batch = sizes.slice(startIdx, end);
      var promises = batch.map(function(size) {
        return new Promise(function(resolve) {
          try {
            var canvas = renderIcon(img, size);
            var formatPromises = [];
            if (outputPng) {
              formatPromises.push(new Promise(function(res) {
                canvas.toBlob(function(blob) {
                  results.push({ size: size, blob: blob, ext: 'png' });
                  res();
                }, 'image/png');
              }));
            }
            if (outputWebp) {
              formatPromises.push(new Promise(function(res) {
                canvas.toBlob(function(blob) {
                  if (blob) results.push({ size: size, blob: blob, ext: 'webp' });
                  res();
                }, 'image/webp', 0.9);
              }));
            }
            Promise.all(formatPromises).then(function() {
              processedCount++;
              updateProgress(5 + (processedCount / sizes.length) * 85);
              resolve();
            });
          } catch (e) {
            processedCount++;
            resolve();
          }
        });
      });
      Promise.all(promises).then(function() {
        setTimeout(function() { processNext(end); }, 30);
      });
    }
    processNext(0);
  }

  function createZipFile(iconResults, folderName, img, sizes, outputPng, outputWebp, outputIco) {
    updateStatus('Creating ZIP...', '#ffaa66');
    updateProgress(92);

    try {
      if (typeof JSZip === 'undefined') throw new Error('JSZip not available');
      var zip = new JSZip();
      var folder = zip.folder(folderName);

      // Platform folders
      selectedPlatforms.forEach(function(platform) {
        var pf = folder.folder(platform);
        var pSizes = SIZE_RULES[platform];
        pf.file('README.txt', platform.toUpperCase() + ' Icons\nGenerated by RatForge (ratbyte.dev)\nSizes: ' + pSizes.join(', '));
        iconResults.forEach(function(r) {
          if (pSizes.indexOf(r.size) !== -1) {
            pf.file('icon_' + r.size + 'x' + r.size + '.' + r.ext, r.blob);
          }
        });
      });

      // Root folder with all icons
      iconResults.forEach(function(r) {
        folder.file('icon_' + r.size + 'x' + r.size + '.' + r.ext, r.blob);
      });

      // ICO file (contains 16, 32, 48 as PNG inside ICO container)
      if (outputIco) {
        var icoBlob = buildIco(img, [16, 32, 48]);
        if (icoBlob) folder.file('favicon.ico', icoBlob);
      }

      // Favicon
      var includeFavicon = document.getElementById('includeFavicon');
      if (includeFavicon && includeFavicon.checked && !outputIco) {
        var favicoBlob = buildIco(img, [16, 32, 48]);
        if (favicoBlob) folder.file('favicon.ico', favicoBlob);
      }

      // Manifest files
      var includeManifest = document.getElementById('includeManifest');
      if (includeManifest && includeManifest.checked) {
        var manifestType = document.getElementById('manifestType');
        var mt = manifestType ? manifestType.value : 'pwa';
        var manifestContent = generateManifestContent(mt, sizes);
        var manifestName = mt === 'xcode' ? 'Contents.json' : 'manifest.json';
        folder.file(manifestName, manifestContent);
      }

      // Base64 exports
      var includeBase64 = document.getElementById('includeBase64');
      if (includeBase64 && includeBase64.checked) {
        var b64Content = '';
        sizes.filter(function(s) { return s <= 64; }).forEach(function(s) {
          var c = renderIcon(img, s);
          b64Content += '/* ' + s + 'x' + s + ' */\n' + c.toDataURL('image/png') + '\n\n';
        });
        if (b64Content) folder.file('base64_data_uris.txt', b64Content);
      }

      // Favicon HTML
      var inclHtml = document.getElementById('includeFaviconHtml');
      if (inclHtml && inclHtml.checked) {
        var htmlTags = '<link rel="icon" type="image/x-icon" href="/favicon.ico">\n' +
          '<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon_32x32.png">\n' +
          '<link rel="icon" type="image/png" sizes="16x16" href="/icons/icon_16x16.png">\n' +
          '<link rel="apple-touch-icon" sizes="180x180" href="/icons/icon_180x180.png">';
        folder.file('favicon_html_tags.html', htmlTags);
      }

      // README
      folder.file('README.txt',
        'RatForge Icon Pack\nGenerated: ' + new Date().toLocaleString() +
        '\nOriginal: ' + selectedFile.name +
        '\nPlatforms: ' + selectedPlatforms.join(', ') +
        '\nSizes: ' + sizes.join(', ') +
        (customSizes.length > 0 ? '\nCustom sizes: ' + customSizes.join(', ') : '') +
        '\nFormats: ' + [outputPng ? 'PNG' : '', outputWebp ? 'WebP' : '', outputIco ? 'ICO' : ''].filter(Boolean).join(', ')
      );

      var compressionLevel = iconResults.length > 10 ? 1 : 6;
      zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: compressionLevel } })
        .then(function(content) {
          var url = URL.createObjectURL(content);
          var filename = folderName + '.zip';
          if (isMobile) {
            handleMobileDownload(url, filename);
          } else if (currentBrowser === 'safari') {
            handleSafariDownload(url, filename);
          } else {
            var a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
          }
          updateStatus('Icons generated! Download started.', '#77dd77');
          updateProgress(100);
          finishProcessing();

          // Show base64 output if requested
          if (includeBase64 && includeBase64.checked) {
            showBase64Output(img, sizes);
          }
        })
        .catch(function(err) {
          updateStatus('Error creating ZIP: ' + err.message, '#ff5555');
          finishProcessing();
        });
    } catch (err) {
      updateStatus('Error: ' + err.message, '#ff5555');
      finishProcessing();
    }
  }

  function finishProcessing() {
    isProcessing = false;
    if (resizeButton) resizeButton.disabled = false;
  }

  // --- ICO Builder (pure JS) ---
  function buildIco(img, sizes) {
    try {
      var images = [];
      sizes.forEach(function(sz) {
        var c = renderIcon(img, sz);
        var dataUrl = c.toDataURL('image/png');
        var base64 = dataUrl.split(',')[1];
        var binary = atob(base64);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        images.push({ size: sz, data: bytes });
      });

      // ICO format: header + directory entries + image data
      var headerSize = 6;
      var dirEntrySize = 16;
      var dataOffset = headerSize + dirEntrySize * images.length;
      var totalSize = dataOffset;
      images.forEach(function(im) { totalSize += im.data.length; });

      var buffer = new ArrayBuffer(totalSize);
      var view = new DataView(buffer);

      // Header
      view.setUint16(0, 0, true); // reserved
      view.setUint16(2, 1, true); // ICO type
      view.setUint16(4, images.length, true);

      var offset = dataOffset;
      images.forEach(function(im, idx) {
        var pos = headerSize + idx * dirEntrySize;
        view.setUint8(pos, im.size >= 256 ? 0 : im.size); // width
        view.setUint8(pos + 1, im.size >= 256 ? 0 : im.size); // height
        view.setUint8(pos + 2, 0); // palette
        view.setUint8(pos + 3, 0); // reserved
        view.setUint16(pos + 4, 1, true); // color planes
        view.setUint16(pos + 6, 32, true); // bits per pixel
        view.setUint32(pos + 8, im.data.length, true); // data size
        view.setUint32(pos + 12, offset, true); // data offset
        // Copy image data
        var arr = new Uint8Array(buffer);
        arr.set(im.data, offset);
        offset += im.data.length;
      });

      return new Blob([buffer], { type: 'image/x-icon' });
    } catch (e) {
      return null;
    }
  }

  // --- Manifest generator ---
  function generateManifestContent(type, sizes) {
    if (type === 'pwa') {
      var icons = sizes.map(function(s) {
        return '    { "src": "/icons/icon_' + s + 'x' + s + '.png", "sizes": "' + s + 'x' + s + '", "type": "image/png" }';
      });
      return '{\n  "icons": [\n' + icons.join(',\n') + '\n  ]\n}';
    } else if (type === 'extension') {
      var obj = {};
      sizes.forEach(function(s) { obj[s] = 'icons/icon_' + s + 'x' + s + '.png'; });
      return '{\n  "icons": ' + JSON.stringify(obj, null, 4) + '\n}';
    } else if (type === 'xcode') {
      var imgs = sizes.map(function(s) {
        return '    {\n      "filename": "icon_' + s + 'x' + s + '.png",\n      "idiom": "universal",\n      "platform": "ios",\n      "size": "' + s + 'x' + s + '"\n    }';
      });
      return '{\n  "images": [\n' + imgs.join(',\n') + '\n  ],\n  "info": { "author": "RatForge", "version": 1 }\n}';
    }
    return '';
  }

  // --- Base64 output display ---
  function showBase64Output(img, sizes) {
    var el = document.getElementById('base64Output');
    if (!el) return;
    var small = sizes.filter(function(s) { return s <= 64; });
    if (small.length === 0) return;
    var content = '';
    small.forEach(function(s) {
      var c = renderIcon(img, s);
      content += '/* ' + s + 'x' + s + ' */\n' + c.toDataURL('image/png') + '\n\n';
    });
    el.textContent = content;
    el.classList.add('active');
  }

  // --- Download helpers ---
  function handleMobileDownload(url, filename) {
    try {
      if (currentBrowser === 'safari') {
        window.open(url, '_blank');
        setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
      } else {
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.setAttribute('target', '_blank');
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      }
    } catch (e) {
      window.location.href = url;
    }
  }
  function handleSafariDownload(url, filename) {
    try {
      var newTab = window.open(url, '_blank');
      if (!newTab || newTab.closed) window.location.href = url;
      setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
    } catch (e) {
      window.location.href = url;
    }
  }

  // --- Clipboard ---
  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }
}
