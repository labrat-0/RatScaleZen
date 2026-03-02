// Define the icon sizes to generate
const ICON_SIZES = [
  16, 32, 48, 64, 72, 96, 128, 144, 152, 192, 256, 384, 512, 1024
];

// Define platform-specific icon size rules (@sizerules.mdc)
const SIZE_RULES = {
  android: [48, 72, 96, 144, 192, 512],
  ios: [40, 58, 60, 80, 87, 120, 180, 1024],
  windows: [16, 32, 44, 48, 50, 150, 310],
  macos: [16, 32, 64, 128, 256, 512, 1024],
  chrome: [16, 32, 48, 128],
  firefox: [16, 32, 48, 64, 128],
  pwa: [48, 72, 96, 144, 168, 192, 512]
};

// Track the state
let selectedFile = null;
let isProcessing = false;
let generatedIcons = [];
let selectedPlatforms = ['chrome']; // Default platform selection
let zipContent = null; // Store generated ZIP file

// Register this window with the background script
function registerWindowWithBackground() {
  try {
    browser.runtime.sendMessage({ 
      action: 'init_window'
    }).then(response => {
      if (response && response.success) {
        console.log('Connected to background script, window ID:', response.windowId);
      }
    }).catch(error => {
      console.error('Error connecting to background:', error);
    });
  } catch (error) {
    console.error('Failed to register window:', error);
  }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log("RatScaleZen DOM loaded");
  
  // Perform a comprehensive check of required DOM elements
  const requiredElements = [
    'dropArea', 'fileInput', 'fileName', 'resizeButton', 
    'progressBar', 'status', 'results', 'overlay', 
    'iconPreviewContainer', 'previewGrid', 'closePreviewBtn', 
    'afterTaskContainer', 'livePreviewSection', 'livePreviewGrid', 
    'platformSelector', 'downloadAfterPreviewBtn'
  ];
  
  let missingElements = [];
  let foundElements = {};
  
  requiredElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      foundElements[id] = true;
      console.log(`✓ Found element: ${id}`);
    } else {
      missingElements.push(id);
      console.error(`✗ MISSING element: ${id}`);
    }
  });
  
  if (missingElements.length > 0) {
    console.error(`CRITICAL ERROR: Missing ${missingElements.length} DOM elements: ${missingElements.join(', ')}`);
    
    // Try to show an error message on the page
    const contentElement = document.querySelector('.content');
    if (contentElement) {
      const errorMessage = document.createElement('div');
      errorMessage.style.padding = '20px';
      errorMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
      errorMessage.style.border = '1px solid red';
      errorMessage.style.borderRadius = '8px';
      errorMessage.style.margin = '20px 0';
      errorMessage.style.color = '#ff5555';
      errorMessage.innerHTML = `<h3>Extension Error</h3><p>Missing required elements: ${missingElements.join(', ')}</p><p>Please try reinstalling the extension.</p>`;
      contentElement.prepend(errorMessage);
      
      // Show troubleshooting section
      const troubleshooting = document.getElementById('troubleshootingSection');
      if (troubleshooting) {
        troubleshooting.classList.add('show');
      }
    }
  }
  
  // Set up troubleshooting section
  const fallbackButton = document.getElementById('fallbackButton');
  const reloadButton = document.getElementById('reloadButton');
  const browserDetails = document.getElementById('browserDetails');
  const troubleshootingSection = document.getElementById('troubleshootingSection');
  
  // Get browser info
  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    let browserName = "Unknown";
    let browserVersion = "Unknown";
    
    if (userAgent.indexOf("Chrome") > -1) {
      browserName = "Chrome";
      browserVersion = userAgent.match(/Chrome\/([0-9.]+)/)[1];
    } else if (userAgent.indexOf("Firefox") > -1) {
      browserName = "Firefox";
      browserVersion = userAgent.match(/Firefox\/([0-9.]+)/)[1];
    } else if (userAgent.indexOf("Edge") > -1) {
      browserName = "Edge";
      browserVersion = userAgent.match(/Edge\/([0-9.]+)/)[1];
    } else if (userAgent.indexOf("Safari") > -1) {
      browserName = "Safari";
      browserVersion = userAgent.match(/Safari\/([0-9.]+)/)[1];
    }
    
    return `${browserName} ${browserVersion}`;
  };
  
  // Add event listeners for troubleshooting buttons
  if (fallbackButton) {
    fallbackButton.addEventListener('click', () => {
      window.fallbackResize();
    });
  }
  
  if (reloadButton) {
    reloadButton.addEventListener('click', () => {
      browser.runtime.reload();
    });
  }
  
  if (browserDetails) {
    browserDetails.textContent = `Browser: ${getBrowserInfo()} | Extension version: ${browser.runtime.getManifest().version}`;
  }
  
  // Show troubleshooting section after a timeout if no file is selected
  setTimeout(() => {
    if (!selectedFile && troubleshootingSection) {
      troubleshootingSection.classList.add('show');
    }
  }, 60000); // Show after 1 minute of inactivity
  
  // Register this window with the background script
  registerWindowWithBackground();
  
  // DEBUG: Add a toggle for the debug box
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F2') {
      const debugBox = document.getElementById('debugBox');
      debugBox.classList.toggle('show');
    }
  });
  
  // Debug logging function
  window.debugLog = function(message) {
    console.log(message);
    const debugContent = document.getElementById('debugContent');
    const logEntry = document.createElement('div');
    logEntry.textContent = `${new Date().toISOString().substr(11, 8)}: ${message}`;
    debugContent.appendChild(logEntry);
    
    // Scroll to bottom
    debugContent.scrollTop = debugContent.scrollHeight;
  };
  
  debugLog('RatScaleZen initialized');
  
  // Initialize UI components
  if (iconPreviewContainer) {
    // Keep in DOM but hide visually for now
    iconPreviewContainer.style.visibility = 'hidden';
    iconPreviewContainer.style.display = 'none'; // This one we can hide completely
    debugLog('Icon preview container initialized');
  } else {
    debugLog('Warning: iconPreviewContainer not found in DOM');
  }
  
  if (livePreviewSection) {
    // Keep in DOM but hide visually for now
    livePreviewSection.style.display = 'none'; // Will be shown via classList.add('show')
    debugLog('Live preview section initialized');
  } else {
    debugLog('Warning: livePreviewSection not found in DOM');
  }
  
  // Identify and initialize important UI elements
  const importantElements = ['dropArea', 'fileInput', 'resizeButton', 'status', 'platformSelector'];
  importantElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      debugLog(`Element found: ${id}`);
    } else {
      debugLog(`WARNING: Element not found: ${id}`);
    }
  });
  
  // Check if JSZip is available
  if (typeof JSZip === 'undefined') {
    console.error("JSZip is not loaded! This is required for the application to work.");
    updateStatus('Error: JSZip library not loaded. Please reload the extension.', '#ff5555');
  } else {
    console.log("JSZip is loaded correctly, version:", JSZip.version || "unknown");
  }
  
  // Notify the background script that the popup is ready
  try {
    browser.runtime.sendMessage({ 
      action: 'setPopupWindow'
    }).then((response) => {
      if (response && response.success) {
        console.log('Connected to background script successfully');
      }
    }).catch((error) => {
      console.error('Error connecting to background script:', error);
    });
  } catch (error) {
    console.error('Failed to connect to background script:', error);
  }
  
  // Get DOM elements
  const dropArea = document.getElementById('dropArea');
  const fileInput = document.getElementById('fileInput');
  const fileName = document.getElementById('fileName');
  const resizeButton = document.getElementById('resizeButton');
  const progressBar = document.getElementById('progressBar');
  const status = document.getElementById('status');
  const results = document.getElementById('results');
  const overlay = document.getElementById('overlay');
  const iconPreviewContainer = document.getElementById('iconPreviewContainer');
  const previewGrid = document.getElementById('previewGrid');
  const closePreviewBtn = document.getElementById('closePreviewBtn');
  const afterTaskContainer = document.getElementById('afterTaskContainer');
  const livePreviewSection = document.getElementById('livePreviewSection');
  const livePreviewGrid = document.getElementById('livePreviewGrid');
  const platformSelector = document.getElementById('platformSelector');
  const downloadAfterPreviewBtn = document.getElementById('downloadAfterPreviewBtn');
  
  // Set up platform selector
  if (platformSelector) {
    setupPlatformSelector();
  }
  
  // Set up event listeners for clicks
  fileInput.addEventListener('change', e => {
    console.log("File input change event triggered");
    const file = e.target.files[0];
    if (file) {
      console.log("File selected:", file.name, file.type, file.size);
      handleFileSelection(file);
    } else {
      console.error("No file selected in the change event");
    }
  });
  
  // Drag and drop utilities
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
    return false; // Added to ensure the browser doesn't open the image
  }
  
  function highlight(e) {
    preventDefaults(e);
    dropArea.classList.add('dragging');
  }
  
  function unhighlight(e) {
    preventDefaults(e);
    dropArea.classList.remove('dragging');
  }

  // Handle file selection logic
  function handleFileSelection(file) {
    debugLog(`File selected: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);
    selectedFile = file;
    fileName.textContent = file.name;
    resizeButton.disabled = false;
    status.textContent = 'Ready to create icon pack';
    status.style.color = '#ff9999';
    
    // Add pulse animation to button
    addPulseAnimation(resizeButton);
    
    // Clear previous results
    results.innerHTML = '';
    results.style.display = 'none';
    progressBar.style.width = '0%';
    
    // Make sure the sections we need are visible
    if (livePreviewSection) {
      debugLog("Ensuring live preview section is ready for display");
      livePreviewSection.style.visibility = 'visible';
      livePreviewSection.style.display = 'block';
      livePreviewSection.style.opacity = '0'; // Will be set to 1 when classList.add('show') is called
    }
    
    // Hide after task options
    hideAfterTaskOptions();
    
    // Show live preview
    try {
      debugLog("Starting live preview generation");
      showLivePreview(file);
    } catch (error) {
      debugLog(`Error in showLivePreview: ${error.message || error}`);
      console.error("Error in showLivePreview:", error);
      // Show fallback info if preview fails
      updateStatus(`File selected: ${file.name} - Ready to process`, '#77dd77');
    }
    
    // Visual feedback for file selection
    dropArea.classList.add('pulse');
    
    // Flash the file name with color change
    if (fileName) {
      // Save original color
      const originalColor = fileName.style.color;
      
      // Briefly change color to indicate success
      fileName.style.color = 'var(--success)';
      fileName.style.transition = 'color 0.5s ease';
      
      // Add a checkmark or icon before the filename
      fileName.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" 
             fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
             stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;">
          <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path>
          <polyline points="9 10 12 13 22 3"></polyline>
        </svg>
        ${file.name}`;
      
      // Revert back after a moment
      setTimeout(() => {
        fileName.style.color = originalColor;
      }, 1500);
    }
    
    // Clean up animations after they complete
    setTimeout(() => {
      dropArea.classList.remove('pulse');
    }, 700);
  }
  
  // Handle drop - rewritten to fix issues
  function handleDrop(e) {
    debugLog("Drop event triggered");
    preventDefaults(e);
    dropArea.classList.remove('dragging');
    
    try {
      // Show processing indicator
      updateStatus('Processing dropped file...', '#ffaa66');
      
      let files;
      if (e.dataTransfer.items) {
        // Use DataTransferItemList interface
        files = Array.from(e.dataTransfer.items)
          .filter(item => item.kind === 'file')
          .map(item => item.getAsFile());
        debugLog(`Found ${files.length} files using items interface`);
      } else {
        // Use DataTransfer interface
        files = Array.from(e.dataTransfer.files);
        debugLog(`Found ${files.length} files using files interface`);
      }
      
      // Get the first file (if any)
      const file = files[0];
      
      if (!file) {
        debugLog("No file found in drop event");
        updateStatus('No file detected. Please try again or use the file selector.', '#ff5555');
        return false;
      }
      
      // Basic validation
      if (!file.type.startsWith('image/')) {
        debugLog(`Invalid file type: ${file.type}`);
        updateStatus(`Invalid file type: ${file.type}. Please use PNG, JPG, or other image formats.`, '#ff5555');
        return false;
      }
      
      // Image size check
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        debugLog(`File too large: ${Math.round(file.size/1024/1024)}MB`);
        updateStatus(`File size (${Math.round(file.size/1024/1024)}MB) exceeds recommended limit. Processing may be slow.`, '#ffaa66');
      }
      
      // Valid image file - process it
      debugLog(`Valid image file dropped: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);
      handleFileSelection(file);
      return false;
    } catch (error) {
      // Handle any errors in the drop event
      const errorMessage = error.message || "Unknown error";
      debugLog(`Error in drop handler: ${errorMessage}`);
      console.error("Drop handler error:", error);
      
      // Show error in UI
      updateStatus(`Error processing file: ${errorMessage}. Please try again.`, '#ff5555');
      
      // Show troubleshooting section on error
      const troubleshooting = document.getElementById('troubleshootingSection');
      if (troubleshooting) {
        troubleshooting.classList.add('show');
      }
    }
    
    return false;
  }
  
  // Set up all drag and drop event listeners
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  
  // Set up specialized handlers for specific events
  dropArea.addEventListener('dragenter', highlight, false);
  dropArea.addEventListener('dragover', highlight, false);
  dropArea.addEventListener('dragleave', unhighlight, false);
  dropArea.addEventListener('drop', handleDrop, false);
  
  // Make the entire drop area clickable to trigger file input
  dropArea.addEventListener('click', (e) => {
    // Don't trigger if clicking on a button or input inside the drop area
    if (!e.target.closest('button') && !e.target.closest('input')) {
      fileInput.click();
    }
  });
  
  // Set up resize button handler
  resizeButton.addEventListener('click', (e) => {
    console.log("Resize button clicked");
    debugLog("Resize button clicked");
    e.preventDefault();
    if (!isProcessing) {
      console.log("Processing not in progress, starting...");
      debugLog("Starting image processing");
      addPulseAnimation(resizeButton);
      processImage();
    } else {
      console.log("Processing already in progress, ignoring click");
      debugLog("Processing already in progress");
    }
  });
  
  // Close preview button
  if (closePreviewBtn) {
    closePreviewBtn.addEventListener('click', closePreview);
  } else {
    console.error("Close preview button not found");
  }
  
  // Close preview when clicking overlay
  overlay.addEventListener('click', closePreview);
  
  // Fallback resizing function - if everything else fails, this will ensure basic functionality
  window.fallbackResize = function() {
    if (!selectedFile) {
      alert("Please select an image file first");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const sizes = [16, 32, 48, 128, 512];
        const zip = new JSZip();
        const folderName = 'ratscale_icons';
        const folder = zip.folder(folderName);
        
        // Create a canvas for resizing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Process each size
        sizes.forEach(size => {
          canvas.width = size;
          canvas.height = size;
          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          
          // Convert to blob
          const dataUrl = canvas.toDataURL('image/png');
          const base64 = dataUrl.split(',')[1];
          folder.file(`icon_${size}x${size}.png`, base64, {base64: true});
        });
        
        // Generate and download zip
        zip.generateAsync({type: 'blob'}).then(content => {
          const url = URL.createObjectURL(content);
          const a = document.createElement('a');
          a.href = url;
          a.download = folderName + '.zip';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(selectedFile);
  };
  
  // Setup platform selector checkboxes
  function setupPlatformSelector() {
    // Clear existing content
    platformSelector.innerHTML = '';
    
    // Create title
    const title = document.createElement('h3');
    title.textContent = 'Target Platforms';
    platformSelector.appendChild(title);
    
    // Create platform options
    const platformsWrapper = document.createElement('div');
    platformsWrapper.className = 'platforms-wrapper';
    
    // Add Select All option
    const selectAllLabel = document.createElement('label');
    selectAllLabel.className = 'platform-option select-all';
    
    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.id = 'selectAllPlatforms';
    selectAllCheckbox.className = 'platform-checkbox';
    
    // Check if all platforms are currently selected
    const allPlatformsSelected = Object.keys(SIZE_RULES).length === selectedPlatforms.length &&
      Object.keys(SIZE_RULES).every(platform => selectedPlatforms.includes(platform));
    
    selectAllCheckbox.checked = allPlatformsSelected;
    
    // Handle Select All checkbox change
    selectAllCheckbox.addEventListener('change', () => {
      const platformCheckboxes = document.querySelectorAll('.platform-checkbox:not(#selectAllPlatforms)');
      
      if (selectAllCheckbox.checked) {
        // Select all platforms
        selectedPlatforms = Object.keys(SIZE_RULES);
        platformCheckboxes.forEach(checkbox => {
          checkbox.checked = true;
        });
      } else {
        // Deselect all platforms
        selectedPlatforms = [];
        platformCheckboxes.forEach(checkbox => {
          checkbox.checked = false;
        });
      }
      
      // Update live preview if an image is selected
      if (selectedFile && livePreviewSection.classList.contains('show')) {
        updateLivePreview();
      }
    });
    
    const selectAllText = document.createElement('span');
    selectAllText.textContent = 'Select All Platforms';
    selectAllText.style.fontWeight = 'bold';
    
    // Add icon count badge for all platforms
    const totalSizes = new Set(
      Object.values(SIZE_RULES).flat()
    ).size;
    
    const totalBadge = document.createElement('span');
    totalBadge.className = 'size-count';
    totalBadge.textContent = `${totalSizes} sizes`;
    
    selectAllLabel.appendChild(selectAllCheckbox);
    selectAllLabel.appendChild(selectAllText);
    selectAllLabel.appendChild(totalBadge);
    platformsWrapper.appendChild(selectAllLabel);
    
    // Add platform grid
    const platformGrid = document.createElement('div');
    platformGrid.className = 'platform-grid';
    
    // Add each platform option
    Object.keys(SIZE_RULES).forEach(platform => {
      const label = document.createElement('label');
      label.className = 'platform-option';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = platform;
      checkbox.checked = selectedPlatforms.includes(platform);
      checkbox.className = 'platform-checkbox';
      
      // Handle checkbox change
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selectedPlatforms.push(platform);
        } else {
          selectedPlatforms = selectedPlatforms.filter(p => p !== platform);
        }
        
        // Update Select All checkbox state
        const allChecked = Object.keys(SIZE_RULES).every(p => 
          selectedPlatforms.includes(p)
        );
        selectAllCheckbox.checked = allChecked;
        
        // Update live preview if an image is selected
        if (selectedFile && livePreviewSection.classList.contains('show')) {
          updateLivePreview();
        }
      });
      
      // Create icon container
      const iconContainer = document.createElement('div');
      iconContainer.className = 'platform-icon';
      
      // Create platform icon
      const icon = document.createElement('img');
      icon.src = `platform_icons/${platform}.svg`;
      icon.alt = platform;
      icon.width = 16;
      icon.height = 16;
      iconContainer.appendChild(icon);
      
      const platformName = document.createElement('span');
      platformName.className = 'platform-name';
      platformName.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);
      
      // Add icon count badge
      const countBadge = document.createElement('span');
      countBadge.className = 'size-count';
      countBadge.textContent = `${SIZE_RULES[platform].length}`;
      
      label.appendChild(checkbox);
      label.appendChild(iconContainer);
      label.appendChild(platformName);
      label.appendChild(countBadge);
      platformGrid.appendChild(label);
    });
    
    platformsWrapper.appendChild(platformGrid);
    platformSelector.appendChild(platformsWrapper);
  }
  
  // Show live preview based on selected file and platforms
  function showLivePreview(file) {
    debugLog(`Generating live preview for ${file.name}`);
    
    // Clear existing preview
    livePreviewGrid.innerHTML = '';
    
    // Create a thumbnail
    const reader = new FileReader();
    
    reader.onload = function(e) {
      debugLog("FileReader loaded image data successfully");
      livePreviewSection.classList.add('show');
      
      // Get unique sizes across selected platforms
      const uniqueSizes = getUniqueSizesFromSelectedPlatforms();
      debugLog(`Found ${uniqueSizes.length} unique sizes for preview`);
      
      // Show at most 6 preview sizes for better performance
      const previewSizes = uniqueSizes.length <= 6 ? 
        uniqueSizes : 
        [uniqueSizes[0], ...uniqueSizes.slice(Math.floor(uniqueSizes.length/2)-1, Math.floor(uniqueSizes.length/2)+1), uniqueSizes[uniqueSizes.length-1]];
      
      // Create image from loaded data
      const img = new Image();
      
      img.onload = function() {
        debugLog("Image loaded for preview generation");
        
        // Create previews for each size
        previewSizes.forEach(size => {
          try {
            debugLog(`Creating preview for ${size}×${size}`);
            createPreviewIcon(img, size);
          } catch (error) {
            debugLog(`Error creating preview for size ${size}: ${error.message || error}`);
          }
        });
      };
      
      img.onerror = function(err) {
        debugLog(`Error loading image for preview: ${err}`);
      };
      
      // Set image source to the loaded file data
      img.src = e.target.result;
    };
    
    reader.onerror = function(error) {
      debugLog(`FileReader error: ${error.message || "Unknown error reading file"}`);
      console.error("FileReader error:", error);
    };
    
    try {
      debugLog("Reading file as DataURL");
      reader.readAsDataURL(file);
    } catch (error) {
      debugLog(`Error reading file: ${error.message || error}`);
      console.error("Error reading file:", error);
    }
  }
  
  // Update live preview when platforms change
  function updateLivePreview() {
    if (!selectedFile) return;
    
    debugLog("Updating live preview based on platform selection");
    
    // Clear existing previews
    livePreviewGrid.innerHTML = '';
    
    // Create a new preview with the current selected platforms
    const reader = new FileReader();
    
    reader.onload = function(e) {
      debugLog("FileReader loaded updated preview data");
      
      // Get unique sizes across selected platforms
      const uniqueSizes = getUniqueSizesFromSelectedPlatforms();
      debugLog(`Found ${uniqueSizes.length} unique sizes for updated preview`);
      
      // Show at most 6 preview sizes for better performance
      const previewSizes = uniqueSizes.length <= 6 ? 
        uniqueSizes : 
        [uniqueSizes[0], ...uniqueSizes.slice(Math.floor(uniqueSizes.length/2)-1, Math.floor(uniqueSizes.length/2)+1), uniqueSizes[uniqueSizes.length-1]];
      
      // Create image
      const img = new Image();
      
      img.onload = function() {
        debugLog("Image loaded for updated preview");
        
        // Create previews for each size
        previewSizes.forEach(size => {
          try {
            createPreviewIcon(img, size);
          } catch (error) {
            debugLog(`Error creating updated preview for size ${size}: ${error.message || error}`);
          }
        });
      };
      
      img.onerror = function(err) {
        debugLog(`Error loading image for updated preview: ${err}`);
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = function(err) {
      debugLog(`FileReader error in updateLivePreview: ${err}`);
    };
    
    try {
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      debugLog(`Error reading file for updateLivePreview: ${error.message || error}`);
    }
  }
  
  // Create a preview icon for live preview
  function createPreviewIcon(img, size) {
    const previewContainer = document.createElement('div');
    previewContainer.className = 'preview-icon-container preview-in';
    
    // Create canvas for resizing
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    
    // Draw image on canvas - important to use the actual image passed in
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, size, size); // Clear canvas first
    ctx.drawImage(img, 0, 0, size, size);
    
    // Create image element for display
    const previewImg = document.createElement('img');
    previewImg.src = canvas.toDataURL('image/png');
    previewImg.className = 'preview-icon';
    
    // Set display size (not actual icon size)
    const displaySize = Math.min(64, size);
    previewImg.style.width = `${displaySize}px`;
    previewImg.style.height = `${displaySize}px`;
    
    // Add border for small icons
    if (size < 48) {
      previewImg.style.border = '1px dashed rgba(255,255,255,0.2)';
      previewImg.style.padding = '2px';
    }
    
    // Add size label
    const sizeLabel = document.createElement('span');
    sizeLabel.className = 'preview-size-label';
    sizeLabel.textContent = `${size}×${size}`;
    
    // Add platform badges if applicable
    const platformBadges = document.createElement('div');
    platformBadges.className = 'platform-badges';
    
    // Check which platforms include this size
    const platformsWithSize = Object.entries(SIZE_RULES)
      .filter(([platform, sizes]) => sizes.includes(size) && selectedPlatforms.includes(platform))
      .map(([platform]) => platform);
    
    // Add badges for up to 3 platforms
    if (platformsWithSize.length > 0) {
      platformsWithSize.slice(0, 3).forEach(platform => {
        const badge = document.createElement('span');
        badge.className = 'platform-badge';
        badge.textContent = platform.charAt(0).toUpperCase();
        badge.title = platform.charAt(0).toUpperCase() + platform.slice(1);
        platformBadges.appendChild(badge);
      });
      
      // Add +X more if there are more platforms
      if (platformsWithSize.length > 3) {
        const moreBadge = document.createElement('span');
        moreBadge.className = 'platform-badge more-badge';
        moreBadge.textContent = `+${platformsWithSize.length - 3}`;
        moreBadge.title = platformsWithSize.slice(3).map(p => 
          p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
        platformBadges.appendChild(moreBadge);
      }
    }
    
    // Assemble preview
    previewContainer.appendChild(previewImg);
    previewContainer.appendChild(sizeLabel);
    previewContainer.appendChild(platformBadges);
    livePreviewGrid.appendChild(previewContainer);
  }
  
  // Get unique sizes across all selected platforms
  function getUniqueSizesFromSelectedPlatforms() {
    if (selectedPlatforms.length === 0) {
      return ICON_SIZES; // Return all sizes if no platforms selected
    }
    
    // Get all sizes from selected platforms
    const allSizes = [];
    selectedPlatforms.forEach(platform => {
      allSizes.push(...SIZE_RULES[platform]);
    });
    
    // Remove duplicates and sort
    return [...new Set(allSizes)].sort((a, b) => a - b);
  }
  
  // Add pulse animation to element
  function addPulseAnimation(element) {
    // Remove existing animation class if present
    element.classList.remove('pulse');
    
    // Force a reflow to restart animation
    void element.offsetWidth;
    
    // Add the animation class
    element.classList.add('pulse');
    
    // Clean up animation class after it completes
    setTimeout(() => {
      element.classList.remove('pulse');
    }, 700);
  }
  
  // Process the selected image
  function processImage() {
    console.log("processImage called, selectedFile:", selectedFile ? selectedFile.name : "none", "isProcessing:", isProcessing);
    
    if (!selectedFile || isProcessing) return;
    
    // Check if at least one platform is selected
    if (selectedPlatforms.length === 0) {
      console.log("No platforms selected");
      updateStatus('Please select at least one platform', '#ffaa66');
      addPulseAnimation(platformSelector);
      return;
    }
    
    console.log("Starting image processing");
    isProcessing = true;
    resizeButton.disabled = true;
    updateStatus('Processing...', '#ffaa66');
    updateProgress(5);
    
    // Get sizes to process from selected platforms
    const sizesToProcess = getUniqueSizesFromSelectedPlatforms();
    
    // Show how many sizes will be processed
    updateStatus(`Processing ${sizesToProcess.length} icon sizes for selected platforms...`, '#ffaa66');
    
    // Create image data from selected file
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const imageData = e.target.result;
      
      // Reset generated icons array
      generatedIcons = [];
      
      // Start processing each size with a small delay between each
      processAllSizes(imageData, 0, [], sizesToProcess);
    };
    
    reader.onerror = (err) => {
      console.error("Error reading file:", err);
      updateStatus('Error reading file: ' + (err.message || 'Unknown error'), '#ff5555');
      isProcessing = false;
      resizeButton.disabled = false;
    };
    
    // Read the file
    reader.readAsDataURL(selectedFile);
  }
  
  // Process all sizes one by one
  function processAllSizes(imageData, index, results, sizesToProcess) {
    if (index >= sizesToProcess.length) {
      // All sizes processed, create ZIP
      createZipFile(results);
      return;
    }
    
    const size = sizesToProcess[index];
    console.log(`Processing size: ${size}x${size}`);
    
    // Create new image
    const img = new Image();
    
    img.onload = () => {
      try {
        // Create canvas and resize image
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        
        // Draw image on canvas - maintain aspect ratio by default
        ctx.drawImage(img, 0, 0, size, size);
        
        // Get image data
        canvas.toBlob((blob) => {
          if (blob) {
            // Store result
            results.push({
              size: size,
              blob: blob
            });
            
            // Store for preview too - create object URL directly from generated blob
            generatedIcons.push({
              size: size,
              url: URL.createObjectURL(blob)
            });
            
            // Update UI
            addResultItem(`Created ${size}x${size} icon`);
            updateProgress(5 + ((index + 1) / sizesToProcess.length) * 85);
            
            // Process next size after a small delay
            setTimeout(() => {
              processAllSizes(imageData, index + 1, results, sizesToProcess);
            }, 50);
          } else {
            addResultItem(`Error creating ${size}x${size} icon`, true);
            
            // Continue with next size
            setTimeout(() => {
              processAllSizes(imageData, index + 1, results, sizesToProcess);
            }, 50);
          }
        }, 'image/png');
      } catch (error) {
        console.error(`Error processing size ${size}:`, error);
        addResultItem(`Error processing ${size}x${size} icon: ${error.message}`, true);
        
        // Continue with next size
        setTimeout(() => {
          processAllSizes(imageData, index + 1, results, sizesToProcess);
        }, 50);
      }
    };
    
    img.onerror = (e) => {
      console.error(`Error loading image for size ${size}:`, e);
      addResultItem(`Error loading image for ${size}x${size}`, true);
      
      // Continue with next size
      setTimeout(() => {
        processAllSizes(imageData, index + 1, results, sizesToProcess);
      }, 50);
    };
    
    // Use the selected file's image data
    img.src = imageData;
  }
  
  // Create ZIP file with all generated icons
  function createZipFile(iconResults) {
    updateStatus('Creating zip file...', '#ffaa66');
    updateProgress(90);
    
    try {
      // Check if JSZip is available
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not available. Please refresh and try again.');
      }
      
      const zip = new JSZip();
      const baseName = selectedFile.name.split('.')[0] || 'icon';
      const folderName = `${baseName}_icons`;
      const folder = zip.folder(folderName);
      
      // Track which sizes have been added to avoid duplicates
      const processedSizes = new Set();
      
      // Get the unique sizes across all selected platforms
      const uniqueSizesToInclude = getUniqueSizesFromSelectedPlatforms();
      
      // Filter icon results to only include sizes from selected platforms
      const filteredIconResults = iconResults.filter(result => 
        uniqueSizesToInclude.includes(result.size)
      );
      
      // Group by platforms - but only include selected platforms
      selectedPlatforms.forEach(platform => {
        const platformFolder = folder.folder(platform);
        const platformSizes = SIZE_RULES[platform];
        
        // Add README for platform
        platformFolder.file("README.txt", `${platform.toUpperCase()} Icons\n` +
                          `Generated using RatScaleZen by ratbyte.dev\n` +
                          `Contains ${platformSizes.length} icons for ${platform} platform\n` +
                          `Sizes: ${platformSizes.join(', ')}`);
        
        // Add icons that match this platform's sizes
        filteredIconResults.forEach(result => {
          if (platformSizes.includes(result.size)) {
            platformFolder.file(`icon_${result.size}x${result.size}.png`, result.blob);
            processedSizes.add(result.size);
          }
        });
      });
      
      // Now add all selected unique sizes to the root folder
      filteredIconResults.forEach(result => {
        folder.file(`icon_${result.size}x${result.size}.png`, result.blob);
      });
      
      // Add a README file with info about selected platforms
      const readmeContent = `RatScaleZen Icon Pack\n` +
                           `Generated: ${new Date().toLocaleString()}\n` +
                           `Original image: ${selectedFile.name}\n` +
                           `Total icons: ${filteredIconResults.length}\n` +
                           `Selected platforms: ${selectedPlatforms.join(', ')}\n\n` +
                           `Sizes generated:\n${filteredIconResults.map(r => `- ${r.size}x${r.size}`).join('\n')}`;
      
      folder.file("README.txt", readmeContent);
      
      // Generate the ZIP file
      zip.generateAsync({ type: 'blob' })
        .then(content => {
          console.log("ZIP created, size: " + content.size);
          
          // Store zip content for later download
          zipContent = {
            content: content,
            filename: `${folderName}.zip`
          };
          
          // Trigger download immediately instead of showing preview
          triggerDownload();
          
          // Update status
          updateStatus('Icons scaled successfully! Download started.', '#77dd77');
          updateProgress(100);
          isProcessing = false;
          resizeButton.disabled = false;
          
          // Show confetti effect
          showSuccessConfetti();
          
          // Show after task options
          showAfterTaskOptions();
        })
        .catch(error => {
          console.error('Error generating zip:', error);
          updateStatus('Error creating zip file: ' + error.message, '#ff5555');
          isProcessing = false;
          resizeButton.disabled = false;
        });
    } catch (error) {
      console.error('Error in zip process:', error);
      updateStatus('Error: ' + error.message, '#ff5555');
      isProcessing = false;
      resizeButton.disabled = false;
    }
  }
  
  // Trigger download of ZIP file
  function triggerDownload() {
    if (!zipContent) return;
    
    console.log("Triggering download");
    
    const platformText = selectedPlatforms.length === Object.keys(SIZE_RULES).length ? 
      "all platforms" : 
      `${selectedPlatforms.length} selected platforms`;
      
    updateStatus(`Downloading icon pack for ${platformText}...`, '#ffaa66');
    
    const zipUrl = URL.createObjectURL(zipContent.content);
    browser.downloads.download({
      url: zipUrl,
      filename: zipContent.filename,
      saveAs: true
    }).then(downloadId => {
      console.log("Download started with ID:", downloadId);
      updateStatus(`Download started! Icon-Pack includes only selected platform sizes.`, '#77dd77');
      
      // Close preview after download starts
      setTimeout(() => {
        closePreview();
      }, 1000);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);
    }).catch(error => {
      console.error("Download error:", error);
      updateStatus('Error saving file: ' + error.message, '#ff5555');
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);
    });
  }
  
  // Show confetti effect when processing completes successfully
  function showSuccessConfetti() {
    // Create confetti container if it doesn't exist
    let confettiContainer = document.getElementById('confettiContainer');
    if (!confettiContainer) {
      confettiContainer = document.createElement('div');
      confettiContainer.id = 'confettiContainer';
      confettiContainer.style.position = 'absolute';
      confettiContainer.style.top = '0';
      confettiContainer.style.left = '0';
      confettiContainer.style.width = '100%';
      confettiContainer.style.height = '100%';
      confettiContainer.style.pointerEvents = 'none';
      confettiContainer.style.zIndex = '100';
      confettiContainer.style.overflow = 'hidden';
      document.querySelector('.container').appendChild(confettiContainer);
    }
    
    // Create confetti pieces
    const colors = ['#ff3333', '#ff9999', '#ffaa66', '#77dd77', '#ffffff'];
    
    for (let i = 0; i < 100; i++) {
      const confetti = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // Random confetti styling
      confetti.style.position = 'absolute';
      confetti.style.width = `${5 + Math.random() * 7}px`;
      confetti.style.height = `${5 + Math.random() * 7}px`;
      confetti.style.backgroundColor = color;
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      confetti.style.opacity = Math.random() + 0.3;
      
      // Random starting position - higher up for better falling effect
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.top = `${-20 - Math.random() * 100}px`;
      
      // Add styles for animation
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      confetti.style.transition = `all ${1 + Math.random() * 3}s ease-out`;
      
      // Add to container
      confettiContainer.appendChild(confetti);
      
      // Start animation after a tiny delay
      setTimeout(() => {
        confetti.style.top = `${100 + Math.random() * 150}%`;
        confetti.style.left = `${parseFloat(confetti.style.left) + (Math.random() * 40 - 20)}%`;
        confetti.style.transform = `rotate(${Math.random() * 360 * 2}deg)`;
      }, 10);
      
      // Remove the element after animation completes
      setTimeout(() => {
        confetti.remove();
      }, 4000);
    }
    
    // Clean up the container after all animations finish
    setTimeout(() => {
      confettiContainer.remove();
    }, 5000);
  }
  
  // Update the progress bar with animation
  function updateProgress(percent) {
    // Add a small delay to make the animation more noticeable
    setTimeout(() => {
      progressBar.style.width = `${percent}%`;
      
      // Update the color based on progress
      if (percent < 25) {
        progressBar.style.background = 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)';
      } else if (percent < 75) {
        progressBar.style.background = 'linear-gradient(90deg, var(--primary-dark) 0%, var(--primary) 100%)';
      } else {
        progressBar.style.background = 'linear-gradient(90deg, var(--primary) 0%, var(--success) 100%)';
      }
    }, 50);
  }
  
  // Update the status message with animation
  function updateStatus(message, color = null) {
    // Fade out
    status.style.opacity = '0';
    status.style.transform = 'translateY(-5px)';
    
    // Update after quick fade
    setTimeout(() => {
      status.textContent = message;
      if (color) {
        status.style.color = color;
        
        // Update the left border color to match
        status.style.borderLeftColor = color;
      }
      
      // Fade in
      status.style.opacity = '1';
      status.style.transform = 'translateY(0)';
    }, 200);
  }
  
  // Show after-task options
  function showAfterTaskOptions() {
    // Clear any existing content
    afterTaskContainer.innerHTML = '';
    
    // Create title
    const title = document.createElement('h3');
    title.textContent = 'What would you like to do next?';
    title.style.textAlign = 'center';
    title.style.marginBottom = '15px';
    title.style.color = 'var(--secondary)';
    
    // Create "Scale Another Image" button
    const newImageButton = document.createElement('button');
    newImageButton.className = 'action-button';
    newImageButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
           style="margin-right: 8px; vertical-align: text-top;">
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
        <line x1="16" y1="5" x2="22" y2="5"></line>
        <line x1="19" y1="2" x2="19" y2="8"></line>
        <circle cx="9" cy="9" r="2"></circle>
        <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
      </svg>
      Select Another Image`;
    newImageButton.addEventListener('click', resetTool);
    
    // Create "Go to Main Menu" button (assuming this means going back to the extension popup)
    const mainMenuButton = document.createElement('button');
    mainMenuButton.className = 'action-button';
    mainMenuButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           style="margin-right: 8px; vertical-align: text-top;">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
      Back to Main Menu`;
    // Reload the browser action popup
    mainMenuButton.addEventListener('click', () => {
      // Reset the tool first
      resetTool();
      // Close this window
      window.close();
    });
    
    // Create "Close Extension" button
    const closeButton = document.createElement('button');
    closeButton.className = 'action-button';
    closeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           style="margin-right: 8px; vertical-align: text-top;">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
      Close Extension`;
    closeButton.addEventListener('click', () => {
      window.close();
    });
    
    // Add elements to container
    afterTaskContainer.appendChild(title);
    afterTaskContainer.appendChild(newImageButton);
    afterTaskContainer.appendChild(mainMenuButton);
    afterTaskContainer.appendChild(closeButton);
    
    // Show with animation
    setTimeout(() => {
      afterTaskContainer.classList.add('show');
      
      // Add staggered entrance for buttons
      const buttons = afterTaskContainer.querySelectorAll('.action-button');
      buttons.forEach((button, index) => {
        button.style.opacity = '0';
        button.style.transform = 'translateY(20px)';
        button.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
          button.style.opacity = '1';
          button.style.transform = 'translateY(0)';
        }, 300 + (index * 150));
      });
    }, 300);
  }
  
  // Hide after-task options
  function hideAfterTaskOptions() {
    afterTaskContainer.classList.remove('show');
  }
  
  // Reset the tool for a new image
  function resetTool() {
    // Reset variables
    selectedFile = null;
    isProcessing = false;
    zipContent = null; // Clear stored ZIP file
    
    // Reset UI elements
    fileName.textContent = '';
    progressBar.style.width = '0%';
    results.innerHTML = '';
    results.style.display = 'none';
    updateStatus('Select an image to scale to all platform sizes', '#ff9999');
    resizeButton.disabled = true;
    
    // Clear live preview section
    livePreviewGrid.innerHTML = '';
    livePreviewSection.classList.remove('show');
    
    // Hide after task container
    hideAfterTaskOptions();
    
    // Close preview if open
    closePreview();
    
    // Clean up URL objects and memory
    if (generatedIcons && generatedIcons.length > 0) {
      generatedIcons.forEach(icon => {
        if (icon.url) {
          URL.revokeObjectURL(icon.url);
        }
      });
      generatedIcons = [];
    }
    
    // Clean up any blob URLs or canvas references that might be retained
    const allCanvases = document.querySelectorAll('canvas');
    allCanvases.forEach(canvas => {
      // Clear the canvas context
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
    
    // Force a garbage collection hint
    if (window.gc) {
      try {
        window.gc();
      } catch (e) {
        console.log('Manual garbage collection not available');
      }
    }
    
    // Add focus animation to drop area
    dropArea.classList.add('pulse');
    setTimeout(() => {
      dropArea.classList.remove('pulse');
    }, 1000);
  }
  
  // Show icon previews
  function showIconPreviews() {
    // Clear existing previews
    previewGrid.innerHTML = '';
    
    // Add loading indicator while preparing previews
    const loadingIndicator = document.createElement('div');
    loadingIndicator.style.textAlign = 'center';
    loadingIndicator.style.padding = '20px';
    loadingIndicator.innerHTML = '<div class="spinner"></div><p>Preparing icon previews...</p>';
    previewGrid.appendChild(loadingIndicator);
    
    // Show preview with animation
    overlay.classList.add('show');
    iconPreviewContainer.classList.add('show');
    
    // Get the unique sizes for selected platforms
    const selectedSizes = getUniqueSizesFromSelectedPlatforms();
    
    // Only show the icon previews after they're generated
    setTimeout(() => {
      // Remove loading indicator
      previewGrid.innerHTML = '';
      
      if (generatedIcons.length > 0) {
        // Create a header that shows selected platforms
        const selectedPlatformsInfo = document.createElement('div');
        selectedPlatformsInfo.className = 'selected-platforms-info';
        selectedPlatformsInfo.innerHTML = `<p>Showing ${selectedSizes.length} icons for: <strong>${selectedPlatforms.join(', ')}</strong></p>`;
        previewGrid.appendChild(selectedPlatformsInfo);
        
        // Create grid with actual generated icons - but only those for selected platforms
        generatedIcons
          .filter(icon => selectedSizes.includes(icon.size))
          .forEach(icon => {
          const iconWrapper = document.createElement('div');
          iconWrapper.className = 'icon-wrapper preview-in';
          
          const iconImage = document.createElement('img');
          iconImage.src = icon.url; // This uses the blob URLs created during processing
          
          // Determine display size and add styling for small icons
          const displaySize = Math.min(icon.size, 100);
          iconImage.width = displaySize;
          iconImage.height = displaySize;
          iconImage.style.objectFit = 'contain';
          
          // Add border and padding for small icons to make them more visible
          if (icon.size < 64) {
            iconImage.style.border = '1px dashed rgba(255,255,255,0.2)';
            iconImage.style.padding = '5px';
            iconImage.style.backgroundColor = 'rgba(40, 40, 40, 0.4)';
          }
          
          // Add platform indicators for this size
          const platformIndicators = document.createElement('div');
          platformIndicators.className = 'platform-indicators';
          
          // Find which platforms use this size - but only from selected platforms
          const platformsForSize = selectedPlatforms.filter(platform => 
            SIZE_RULES[platform].includes(icon.size));
          
          // Add platform indicators
          if (platformsForSize.length > 0) {
            platformsForSize.forEach(platform => {
              const indicator = document.createElement('span');
              indicator.className = 'platform-indicator';
              indicator.textContent = platform.charAt(0).toUpperCase();
              indicator.title = platform;
              platformIndicators.appendChild(indicator);
            });
          }
          
          const iconLabel = document.createElement('div');
          iconLabel.className = 'icon-label';
          iconLabel.textContent = `${icon.size}×${icon.size}`;
          
          iconWrapper.appendChild(iconImage);
          iconWrapper.appendChild(iconLabel);
          iconWrapper.appendChild(platformIndicators);
          previewGrid.appendChild(iconWrapper);
        });
      } else {
        // Show a message if no icons were generated
        const noIconsMessage = document.createElement('div');
        noIconsMessage.className = 'no-icons-message';
        noIconsMessage.textContent = 'No icons were generated. Please try again.';
        previewGrid.appendChild(noIconsMessage);
      }
    }, 500);
  }
  
  // Close icon preview
  function closePreview() {
    overlay.classList.remove('show');
    iconPreviewContainer.classList.remove('show');
  }
  
  // Add a result item
  function addResultItem(message, isError = false) {
    // Show the results container
    results.style.display = 'block';
    
    // Create a new result item
    const item = document.createElement('div');
    item.className = isError ? 'result-item error' : 'result-item';
    item.textContent = message;
    
    // Add to the results
    results.appendChild(item);
    results.scrollTop = results.scrollHeight;
  }
  
  // Hide preview sections - we don't need them as we're triggering download automatically
  if (iconPreviewContainer) {
    iconPreviewContainer.style.visibility = 'hidden';
    // iconPreviewContainer.style.display = 'none';
  }
  
  if (livePreviewSection) {
    livePreviewSection.style.visibility = 'hidden';
    // livePreviewSection.style.display = 'none';
  }
});
