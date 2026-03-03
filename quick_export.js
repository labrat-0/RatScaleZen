// RatForge Quick Export — PNG at standard sizes + favicon.ico
// No options, just drop and go.

var SIZES = [16, 32, 48, 64, 128, 192, 256, 512];
var ICO_SIZES = [16, 32, 48];
var VALID = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'];

document.addEventListener('DOMContentLoaded', function() {
  var dropArea = document.getElementById('dropArea');
  var fileInput = document.getElementById('fileInput');
  var progressWrap = document.getElementById('progressWrap');
  var progressBar = document.getElementById('progressBar');
  var statusEl = document.getElementById('status');
  var resultEl = document.getElementById('result');
  var resultCount = document.getElementById('resultCount');
  var openFull = document.getElementById('openFull');

  if (!dropArea || !fileInput) return;

  // Drag and drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(ev) {
    dropArea.addEventListener(ev, function(e) { e.preventDefault(); e.stopPropagation(); });
  });
  ['dragenter', 'dragover'].forEach(function(ev) {
    dropArea.addEventListener(ev, function() { dropArea.classList.add('dragging'); });
  });
  ['dragleave', 'drop'].forEach(function(ev) {
    dropArea.addEventListener(ev, function() { dropArea.classList.remove('dragging'); });
  });
  dropArea.addEventListener('drop', function(e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener('change', function(e) {
    if (e.target.files && e.target.files.length > 0) handleFile(e.target.files[0]);
  });

  // Open full toolkit
  if (openFull) {
    openFull.addEventListener('click', function() {
      browser.runtime.sendMessage({ action: 'open_app' });
    });
  }

  function setStatus(msg, color) {
    if (statusEl) { statusEl.textContent = msg; statusEl.style.color = color || ''; }
  }
  function setProgress(pct) {
    if (progressBar) progressBar.style.width = pct + '%';
  }

  function handleFile(file) {
    if (!file || VALID.indexOf(file.type) === -1) {
      setStatus('Invalid format. Use PNG, JPG, WebP, GIF, or SVG.', '#ff3333');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus('File too large. Max 5MB.', '#ff3333');
      return;
    }
    progressWrap.classList.add('active');
    resultEl.classList.remove('active');
    setStatus('Loading image...', '#ffaa00');
    setProgress(5);

    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function() {
      processImage(img, file.name);
      URL.revokeObjectURL(url);
    };
    img.onerror = function() {
      setStatus('Failed to load image.', '#ff3333');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function processImage(img, fileName) {
    setStatus('Generating icons...', '#ffaa00');
    setProgress(10);

    var baseName = fileName.split('.')[0] || 'icon';
    var folderName = baseName + '_icons';
    var results = [];
    var done = 0;

    SIZES.forEach(function(sz) {
      var canvas = renderIcon(img, sz);
      canvas.toBlob(function(blob) {
        results.push({ size: sz, blob: blob });
        done++;
        setProgress(10 + (done / SIZES.length) * 70);
        if (done === SIZES.length) buildZip(results, img, folderName);
      }, 'image/png');
    });
  }

  function renderIcon(img, size) {
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size, size);
    return canvas;
  }

  function buildIco(img) {
    try {
      var images = [];
      ICO_SIZES.forEach(function(sz) {
        var c = renderIcon(img, sz);
        var dataUrl = c.toDataURL('image/png');
        var base64 = dataUrl.split(',')[1];
        var binary = atob(base64);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        images.push({ size: sz, data: bytes });
      });
      var headerSize = 6;
      var dirEntrySize = 16;
      var dataOffset = headerSize + dirEntrySize * images.length;
      var totalSize = dataOffset;
      images.forEach(function(im) { totalSize += im.data.length; });
      var buffer = new ArrayBuffer(totalSize);
      var view = new DataView(buffer);
      view.setUint16(0, 0, true);
      view.setUint16(2, 1, true);
      view.setUint16(4, images.length, true);
      var offset = dataOffset;
      images.forEach(function(im, idx) {
        var pos = headerSize + idx * dirEntrySize;
        view.setUint8(pos, im.size >= 256 ? 0 : im.size);
        view.setUint8(pos + 1, im.size >= 256 ? 0 : im.size);
        view.setUint8(pos + 2, 0);
        view.setUint8(pos + 3, 0);
        view.setUint16(pos + 4, 1, true);
        view.setUint16(pos + 6, 32, true);
        view.setUint32(pos + 8, im.data.length, true);
        view.setUint32(pos + 12, offset, true);
        var arr = new Uint8Array(buffer);
        arr.set(im.data, offset);
        offset += im.data.length;
      });
      return new Blob([buffer], { type: 'image/x-icon' });
    } catch (e) {
      return null;
    }
  }

  function buildZip(results, img, folderName) {
    setStatus('Creating ZIP...', '#ffaa00');
    setProgress(85);
    try {
      if (typeof JSZip === 'undefined') throw new Error('JSZip not available');
      var zip = new JSZip();
      var folder = zip.folder(folderName);

      results.sort(function(a, b) { return a.size - b.size; });
      results.forEach(function(r) {
        folder.file('icon_' + r.size + 'x' + r.size + '.png', r.blob);
      });

      var ico = buildIco(img);
      if (ico) folder.file('favicon.ico', ico);

      zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
        .then(function(content) {
          setProgress(100);
          setStatus('Done!', '#00ff55');
          resultEl.classList.add('active');
          resultCount.textContent = results.length + ' PNGs + favicon.ico';

          var a = document.createElement('a');
          a.href = URL.createObjectURL(content);
          a.download = folderName + '.zip';
          document.body.appendChild(a);
          a.click();
          setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 200);
        })
        .catch(function(err) {
          setStatus('ZIP error: ' + err.message, '#ff3333');
        });
    } catch (err) {
      setStatus('Error: ' + err.message, '#ff3333');
    }
  }
});
