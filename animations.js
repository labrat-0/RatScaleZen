// Browser detection for specific optimizations
function detectBrowser() {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.indexOf('edge') > -1 || userAgent.indexOf('edg/') > -1) {
    document.body.classList.add('edge-browser');
  } else if (userAgent.indexOf('chrome') > -1) {
    if (userAgent.indexOf('brave') > -1) {
      document.body.classList.add('brave-browser');
    } else {
      document.body.classList.add('chrome-browser');
    }
  } else if (userAgent.indexOf('firefox') > -1) {
    document.body.classList.add('firefox-browser');
  } else if (userAgent.indexOf('safari') > -1 && userAgent.indexOf('chrome') === -1) {
    document.body.classList.add('safari-browser');
  }
}

// JSZip error handling
function verifyJSZip() {
  if (typeof JSZip === 'undefined') {
    console.error('JSZip not defined! Unable to process images');
    
    // Show error to user instead of loading from CDN (which would be blocked by CSP)
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = 'Error: JSZip library is missing. Please reload the extension.';
      statusElement.style.color = '#ff5555';
    }
  } else {
    console.log('JSZip is properly loaded');
  }
}

// Enhanced Digital Rain Animation
function createDigitalRain() {
  const rain = document.getElementById('digitalRain');
  const width = window.innerWidth;
  const characters = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split('');
  
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      const drop = document.createElement('div');
      drop.style.position = 'fixed';
      drop.style.color = '#00ff55';
      drop.style.left = Math.random() * width + 'px';
      drop.style.top = '-20px';
      drop.style.opacity = Math.random() * 0.5 + 0.1;
      drop.style.fontSize = Math.random() * 14 + 10 + 'px';
      drop.style.fontFamily = 'monospace';
      drop.style.zIndex = '-1';
      drop.style.textShadow = '0 0 5px #00ff55';
      
      // Set random character
      drop.textContent = characters[Math.floor(Math.random() * characters.length)];
      
      // Set animation
      const duration = Math.random() * 4 + 2;
      drop.style.animation = `digitalRain ${duration}s linear`;
      
      rain.appendChild(drop);
      
      // Remove after animation completes
      setTimeout(() => {
        if (rain.contains(drop)) {
          rain.removeChild(drop);
        }
      }, duration * 1000);
    }, i * 120);
  }
}

// Digital rain animation enhancements
function startDigitalRain() {
  createDigitalRain();
  
  // Periodically refresh digital rain
  setInterval(createDigitalRain, 5000);
}

// Create cheese rain effect for loading
function createCheeseRain(active = false) {
  const cheeseRain = document.getElementById('cheeseRain');
  
  // Clear all children elements safely
  while (cheeseRain.firstChild) {
    cheeseRain.removeChild(cheeseRain.firstChild);
  }
  
  if (active) {
    cheeseRain.classList.add('active');
    const width = window.innerWidth;
    const cheeseEmojis = ['🧀', '🐭', '🐁', '🐀'];
    
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        const cheese = document.createElement('div');
        cheese.classList.add('cheese');
        cheese.textContent = cheeseEmojis[Math.floor(Math.random() * cheeseEmojis.length)];
        cheese.style.left = Math.random() * width + 'px';
        cheese.style.fontSize = Math.random() * 20 + 15 + 'px';
        
        // Set animation duration and delay
        const duration = Math.random() * 5 + 3;
        cheese.style.animationDuration = `${duration}s`;
        
        cheeseRain.appendChild(cheese);
        
        // Remove after animation completes
        setTimeout(() => {
          if (cheeseRain.contains(cheese)) {
            cheeseRain.removeChild(cheese);
          }
        }, duration * 1000);
      }, i * 200);
    }
  } else {
    cheeseRain.classList.remove('active');
  }
}

// Setup UI event listeners
function setupEventListeners() {
  // Additional event listeners and loading effects
  const resizeButton = document.getElementById('resizeButton');
  const progressBar = document.getElementById('progressBar');
  
  // Trigger cheese rain when generating icons
  resizeButton.addEventListener('click', () => {
    if (!resizeButton.disabled) {
      // Start cheese rain animation when processing begins
      createCheeseRain(true);
      
      // Set up a progress bar observer to stop the cheese rain when done
      const progressObserver = setInterval(() => {
        const progress = parseInt(progressBar.style.width);
        if (progress >= 100) {
          createCheeseRain(false);
          clearInterval(progressObserver);
        }
      }, 500);
    }
  });
  
  // Also start cheese rain during file loading
  const fileInput = document.getElementById('fileInput');
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      createCheeseRain(true);
      
      // Stop after a short preview
      setTimeout(() => {
        createCheeseRain(false);
      }, 3000);
    }
  });
}

// Initialize RatScaleZen when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  detectBrowser();
  verifyJSZip();
  setupEventListeners();
});

// Start animations after the page fully loads
window.addEventListener('load', startDigitalRain);
