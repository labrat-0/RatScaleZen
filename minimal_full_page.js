// Define the icon sizes to generate
const ICON_SIZES = [
  16, 32, 48, 64, 72, 96, 128, 144, 152, 192, 256, 384, 512, 1024
];

// Define platform-specific icon size rules
const SIZE_RULES = {
  android: [48, 72, 96, 144, 192, 512],
  ios: [40, 58, 60, 80, 87, 120, 180, 1024],
  windows: [16, 32, 44, 48, 50, 150, 310],
  macos: [16, 32, 64, 128, 256, 512, 1024],
  chrome: [16, 32, 48, 128],
  firefox: [16, 32, 48, 64, 128],
  pwa: [48, 72, 96, 144, 168, 192, 512]
};

// Valid image formats to accept
const VALID_IMAGE_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'];

// Browser detection for optimizations
function detectBrowser() {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.indexOf('edge') > -1 || userAgent.indexOf('edg/') > -1) {
    return 'edge';
  } else if (userAgent.indexOf('chrome') > -1 && userAgent.indexOf('safari') > -1) {
    if (userAgent.indexOf('brave') > -1) {
      return 'brave';
    }
    return 'chrome';
  } else if (userAgent.indexOf('firefox') > -1) {
    return 'firefox';
  } else if (userAgent.indexOf('safari') > -1 && userAgent.indexOf('chrome') === -1) {
    return 'safari';
  }
  return 'unknown';
}

// Device detection
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
}

// Application state
let selectedFile = null;
let isProcessing = false;
let selectedPlatforms = ['chrome']; // Default platform selection
let currentBrowser = detectBrowser();
let isMobile = isMobileDevice();

// Make sure we initialize as soon as possible
if (document.readyState === 'loading') {
  // If the document is still loading, add an event listener
  document.addEventListener('DOMContentLoaded', initApp);
  console.log('Waiting for DOMContentLoaded event...');
} else {
  // If DOMContentLoaded has already fired, run the function now
  console.log('Document already loaded, initializing now');
  // Small timeout to ensure all elements are ready
  setTimeout(initApp, 10);
}

// Also add a window load handler for extra safety
window.addEventListener('load', () => {
  if (!window.appInitialized) {
    console.log('Window load event - initializing app if not already initialized');
    initApp();
  }
});

// Main initialization function
function initApp() {
  // Prevent multiple initializations
  if (window.appInitialized) {
    console.log('App already initialized, skipping');
    return;
  }
  
  console.log("RatScaleZen initialization started");
  window.appInitialized = true;
  
  // Get DOM elements - this is critical
  const dropArea = document.getElementById('dropArea');
  const fileName = document.getElementById('fileName');
  const resizeButton = document.getElementById('resizeButton');
  const progressBar = document.getElementById('progressBar');
  const status = document.getElementById('status');
  const platformSelector = document.getElementById('platformSelector');
  const processingInfo = document.getElementById('processingInfo');
  const mobileUpload = document.getElementById('mobileUpload');
  const mobileGalleryBtn = document.getElementById('mobileGalleryBtn');
  
  // Exit if critical elements are missing
  if (!dropArea) {
    console.error("Critical elements missing from DOM");
    return;
  }
  
  // Set up platform selector
  setupPlatformSelector();
  
  // Basic show/hide function for UI elements
  function showElement(element, show = true) {
    if (element) {
      element.style.display = show ? 'block' : 'none';
    }
  }
  
  // Update status message
  function updateStatus(message, color) {
    if (status) {
      status.textContent = message;
      if (color) {
        status.style.color = color;
      }
    }
    console.log(message);
  }
  
  // Update progress bar
  function updateProgress(percent) {
    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }
  }

  // Setup all file input methods
  setupInputMethods();
  
  function setupInputMethods() {
    // Setup drag and drop for desktop
    setupDragAndDrop();
    
    // Setup mobile gallery selection
    setupMobileGallery();
  }
  
  function setupDragAndDrop() {
    if (!dropArea) return;
    
    // Prevent default behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });
    
    // Add highlighting when file is dragged over
    ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => {
        dropArea.classList.add('dragging');
      }, false);
    });
    
    // Remove highlighting when file is dragged away
    ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => {
        dropArea.classList.remove('dragging');
      }, false);
    });
    
    // Handle actual file drop
    dropArea.addEventListener('drop', e => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        const file = dt.files[0];
        
        // Validate file format
        if (isValidImageFormat(file)) {
          handleFileSelection(file);
        } else {
          updateStatus(`Invalid file format. Please drop a supported image (${getFormatsString()})`, '#ff5555');
        }
      }
    }, false);
  }
  
  // Setup mobile gallery for photo selection
  function setupMobileGallery() {
    // Handle file input change for mobile
    if (mobileUpload) {
      mobileUpload.addEventListener('change', e => {
        if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          
          // Validate file format
          if (isValidImageFormat(file)) {
            handleFileSelection(file);
          } else {
            updateStatus(`Invalid file format. Please select a supported image (${getFormatsString()})`, '#ff5555');
          }
        }
      });
    }
    
    // Handle mobile gallery button click
    if (mobileGalleryBtn) {
      mobileGalleryBtn.addEventListener('click', () => {
        if (mobileUpload) {
          // Trigger the file input click programmatically
          mobileUpload.click();
        }
      });
    }
    
    // Special handling for iOS
    if (currentBrowser === 'safari' && isMobile) {
      setupIOSPhotoCapture();
    }
  }
  
  // Special handling for iOS photo capture
  function setupIOSPhotoCapture() {
    // For iOS, make sure we have the right input type
    if (mobileUpload) {
      // On iOS, we need to ensure capture is available
      mobileUpload.setAttribute('capture', 'camera');
      mobileUpload.setAttribute('accept', 'image/*');
    }
  }
  
  // Check if the file format is valid
  function isValidImageFormat(file) {
    return file && VALID_IMAGE_FORMATS.includes(file.type);
  }
  
  // Get a readable string of valid formats
  function getFormatsString() {
    return 'PNG, JPEG, WebP, GIF, SVG';
  }
  
  // Handle file selection
  function handleFileSelection(file) {
    if (!file || !isValidImageFormat(file)) {
      updateStatus(`Please select a valid image format (${getFormatsString()})`, '#ff5555');
      return;
    }
    
    // Check file size - limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      updateStatus('File too large. Maximum size is 5MB', '#ff5555');
      return;
    }
    
    // Set selected file
    selectedFile = file;
    
    // Display file name
    if (fileName) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      fileName.textContent = `${file.name} (${fileSizeMB} MB)`;
    }
    
    // Enable process button
    if (resizeButton) {
      resizeButton.disabled = false;
    }
    
    updateStatus('Ready to create icon pack', '#ff9999');
  }
  
  // Set up resize button handler
  if (resizeButton) {
    resizeButton.addEventListener('click', startProcessing);
  }
  
  function startProcessing() {
    if (!selectedFile || isProcessing) return;
    processImage();
  }
  
  // Process the image
  function processImage() {
    if (!selectedFile || isProcessing) return;
    
    // Check if at least one platform is selected
    if (selectedPlatforms.length === 0) {
      updateStatus('Please select at least one platform', '#ffaa66');
      return;
    }

    // Check file size and warn if large
    const fileSizeMB = selectedFile.size / (1024 * 1024);
    
    // Show appropriate messages based on file size
    if (fileSizeMB > 3) {
      updateStatus(`Processing ${fileSizeMB.toFixed(1)} MB image...`, '#ffaa66');
      if (processingInfo) processingInfo.style.display = 'block';
    } else {
      updateStatus('Processing...', '#ffaa66');
    }
    
    // Start processing
    isProcessing = true;
    if (resizeButton) {
      resizeButton.disabled = true;
    }
    
    updateProgress(5);
    
    // Get unique sizes to process
    const sizesToProcess = getUniqueSizesFromSelectedPlatforms();
    
    // Process image with optimization for larger images
    processImageWithOptimization(sizesToProcess);
  }

  // Optimized image processing for larger files
  function processImageWithOptimization(sizes) {
    try {
      // Use object URL for better memory performance
      const objectUrl = URL.createObjectURL(selectedFile);
      const img = new Image();
      
      img.onload = () => {
        // Process in batches for memory efficiency
        processSizesInBatches(img, sizes);
        URL.revokeObjectURL(objectUrl);
      };
      
      img.onerror = () => {
        updateStatus('Error loading image', '#ff5555');
        isProcessing = false;
        if (resizeButton) resizeButton.disabled = false;
        if (processingInfo) processingInfo.style.display = 'none';
        URL.revokeObjectURL(objectUrl);
      };
      
      img.src = objectUrl;
    } catch (error) {
      console.error('Error processing image:', error);
      updateStatus('Error: ' + error.message, '#ff5555');
      isProcessing = false;
      if (resizeButton) resizeButton.disabled = false;
      if (processingInfo) processingInfo.style.display = 'none';
    }
  }
  
  // Process sizes in batches to avoid memory issues
  function processSizesInBatches(img, sizes, batchSize = 5) {
    const baseName = selectedFile.name.split('.')[0] || 'icon';
    const folderName = `${baseName}_icons`;
    const results = [];
    let processedCount = 0;
    
    // Process in batches
    function processNextBatch(startIndex) {
      // If all batches processed, create ZIP
      if (startIndex >= sizes.length) {
        createZipFile(results, folderName);
        return;
      }
      
      // Process current batch
      const endIndex = Math.min(startIndex + batchSize, sizes.length);
      const currentBatch = sizes.slice(startIndex, endIndex);
      
      const batchPromises = currentBatch.map(size => {
        return new Promise(resolve => {
          try {
            // Create canvas for resizing
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, size, size);
            
            // Convert to blob
            canvas.toBlob(blob => {
              results.push({ size: size, blob: blob });
              processedCount++;
              updateProgress(5 + (processedCount / sizes.length) * 90);
              resolve();
            }, 'image/png');
          } catch (error) {
            console.error(`Error processing size ${size}:`, error);
            processedCount++;
            resolve(); // Continue anyway
          }
        });
      });
      
      // When all in batch done, process next batch
      Promise.all(batchPromises).then(() => {
        // Small delay to allow UI to update and reduce memory pressure
        setTimeout(() => {
          processNextBatch(endIndex);
        }, 50);
      });
    }
    
    // Start processing with first batch
    processNextBatch(0);
  }
  
  // Create ZIP file from results
  function createZipFile(iconResults, folderName) {
    updateStatus('Creating ZIP file...', '#ffaa66');
    updateProgress(95);
    
    try {
      // Check if JSZip is available
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not available');
      }
      
      const zip = new JSZip();
      const folder = zip.folder(folderName);
      
      // Process each platform in sequence to avoid memory issues
      const processPlatforms = (index = 0) => {
        if (index >= selectedPlatforms.length) {
          // All platforms processed, now add files to root folder
          processRootFolder();
          return;
        }
        
        const platform = selectedPlatforms[index];
        const platformFolder = folder.folder(platform);
        const platformSizes = SIZE_RULES[platform];
        
        // Add README for platform
        platformFolder.file("README.txt", `${platform.toUpperCase()} Icons\n` +
                          `Generated using RatScaleZen by ratbyte.dev\n` +
                          `Contains ${platformSizes.length} icons for ${platform} platform\n` +
                          `Sizes: ${platformSizes.join(', ')}`);
        
        // Add icons that match this platform's sizes
        iconResults.forEach(result => {
          if (platformSizes.includes(result.size)) {
            platformFolder.file(`icon_${result.size}x${result.size}.png`, result.blob);
          }
        });
        
        // Process next platform
        setTimeout(() => {
          processPlatforms(index + 1);
        }, 50);
      };
      
      // Add all selected sizes to root folder
      const processRootFolder = () => {
        // Add files in smaller batches
        const processBatch = (startIndex = 0, batchSize = 5) => {
          const endIndex = Math.min(startIndex + batchSize, iconResults.length);
          const currentBatch = iconResults.slice(startIndex, endIndex);
          
          // Process current batch
          currentBatch.forEach(result => {
            folder.file(`icon_${result.size}x${result.size}.png`, result.blob);
          });
          
          if (endIndex < iconResults.length) {
            // More batches to process
            setTimeout(() => {
              processBatch(endIndex, batchSize);
            }, 50);
          } else {
            // All files added, add README and generate ZIP
            finalizeZip();
          }
        };
        
        // Start processing in batches
        processBatch();
      };
      
      // Add README and generate ZIP
      const finalizeZip = () => {
        // Add a README file with info about selected platforms
        const readmeContent = `RatScaleZen Icon Pack\n` +
                           `Generated: ${new Date().toLocaleString()}\n` +
                           `Original image: ${selectedFile.name}\n` +
                           `Total icons: ${iconResults.length}\n` +
                           `Selected platforms: ${selectedPlatforms.join(', ')}\n\n` +
                           `Sizes generated:\n${iconResults.map(r => `- ${r.size}x${r.size}`).join('\n')}`;
        
        folder.file("README.txt", readmeContent);
        
        // Generate the ZIP file with optimized compression level for large files
        const compressionLevel = iconResults.length > 10 ? 1 : 6;
        
        zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: compressionLevel }
        }).then(content => {
          // Trigger download
          let url = URL.createObjectURL(content);
          let filename = `${folderName}.zip`;
          
          // Handle mobile-specific download approach
          if (isMobile) {
            handleMobileDownload(url, filename);
          }
          // Handle Safari-specific download approach
          else if (currentBrowser === 'safari') {
            handleSafariDownload(url, filename);
          } else {
            // Standard download approach
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }, 100);
          }
          
          // Update UI
          updateStatus('Icons created successfully! Download started.', '#77dd77');
          updateProgress(100);
          isProcessing = false;
          
          // Hide processing info
          if (processingInfo) {
            processingInfo.style.display = 'none';
          }
          
          if (resizeButton) {
            resizeButton.disabled = false;
          }

          // Reset for next use
          resetUI();
        }).catch(error => {
          console.error('Error generating zip:', error);
          updateStatus('Error creating ZIP file: ' + error.message, '#ff5555');
          isProcessing = false;
          
          // Hide processing info on error
          if (processingInfo) {
            processingInfo.style.display = 'none';
          }
          
          if (resizeButton) {
            resizeButton.disabled = false;
          }
        });
      };
      
      // Start processing platforms
      processPlatforms();
    } catch (error) {
      console.error('Error in ZIP process:', error);
      updateStatus('Error: ' + error.message, '#ff5555');
      isProcessing = false;
      
      // Hide processing info on error
      if (processingInfo) {
        processingInfo.style.display = 'none';
      }
      
      if (resizeButton) {
        resizeButton.disabled = false;
      }
    }
  }
  
  // Reset UI state after successful processing
  function resetUI() {
    // Clear file name
    if (fileName) {
      fileName.textContent = '';
    }
    
    // Reset selected file
    selectedFile = null;
    
    // Disable process button
    if (resizeButton) {
      resizeButton.disabled = true;
    }
    
    // Clear mobile file input
    if (mobileUpload) {
      mobileUpload.value = '';
    }
    
    // Reset progress bar after a short delay
    setTimeout(() => {
      updateProgress(0);
    }, 2000);
  }
  
  // Mobile-specific download handler
  function handleMobileDownload(url, filename) {
    try {
      // For iOS, we need to open in a new tab
      if (currentBrowser === 'safari') {
        window.open(url, '_blank');
        
        // Clean up the URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 60000); // Longer timeout for Safari
        
        updateStatus('ZIP file opened in new tab. Save it to your device.', '#77dd77');
      } else {
        // For Android and other mobile browsers
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.setAttribute('target', '_blank'); // Some mobile browsers need this
        document.body.appendChild(a);
        a.click();
        
        // Clean up after a delay
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      }
    } catch (error) {
      console.error('Mobile download error:', error);
      
      // Fallback to simply opening the URL in the current window
      window.location.href = url;
    }
  }
  
  // Safari-specific download handler
  function handleSafariDownload(url, filename) {
    try {
      // In Safari, we need to open the URL in a new window/tab
      const newTab = window.open(url, '_blank');
      
      // If popup is blocked, fall back to same window
      if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
        // Inform user to save the file manually
        updateStatus('Please right-click and select "Save As" to download the file', '#ffaa66');
        window.location.href = url;
      } else {
        // Inform user what happened
        updateStatus('ZIP file opened in new tab. Please save it to your device.', '#77dd77');
      }
      
      // Clean up the URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000); // Longer timeout for Safari
    } catch (error) {
      console.error('Safari download error:', error);
      
      // Last resort, just change the current window location
      window.location.href = url;
    }
  }
  
  // Get unique sizes across all selected platforms
  function getUniqueSizesFromSelectedPlatforms() {
    if (selectedPlatforms.length === 0) {
      return ICON_SIZES; // Return all sizes if no platforms selected
    }
    
    // Get all sizes from selected platforms
    const allSizes = [];
    selectedPlatforms.forEach(platform => {
      if (SIZE_RULES[platform]) {
        allSizes.push(...SIZE_RULES[platform]);
      }
    });
    
    // Remove duplicates and sort
    return [...new Set(allSizes)].sort((a, b) => a - b);
  }
  
  // Set up platform selector checkboxes
  function setupPlatformSelector() {
    if (!platformSelector) return;
    
    // Clear existing content and add title
    platformSelector.innerHTML = '<h3>Target Platforms</h3>';
    
    try {
      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'platforms-wrapper';
      
      // Add select all option
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
      });
      
      const selectAllText = document.createElement('span');
      selectAllText.textContent = 'Select All Platforms';
      selectAllText.style.fontWeight = 'bold';
      
      // Add total sizes badge
      const totalSizes = new Set(
        Object.values(SIZE_RULES).flat()
      ).size;
      
      const totalBadge = document.createElement('span');
      totalBadge.className = 'size-count';
      totalBadge.textContent = `${totalSizes} sizes`;
      
      selectAllLabel.appendChild(selectAllCheckbox);
      selectAllLabel.appendChild(selectAllText);
      selectAllLabel.appendChild(totalBadge);
      wrapper.appendChild(selectAllLabel);
      
      // Create platform grid
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
      
      wrapper.appendChild(platformGrid);
      platformSelector.appendChild(wrapper);
    } catch (error) {
      console.error(`Error setting up platform selector: ${error.message}`);
    }
  }
} 