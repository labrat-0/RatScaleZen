// Automatically open the main application window when popup is loaded
// No need for user interaction with an "Open Tool" button
// Converted for Firefox/Zen Browser (browser.* APIs)

// Function to show status messages
function showStatus(message) {
  const statusElement = document.getElementById('statusMessage');
  if (statusElement) {
    statusElement.textContent = message;
  }
}

// Function to directly open the full page application
function openFullPageApp() {
  console.log('Auto-opening the main application...');
  
  // Try first method - direct window creation
  browser.windows.create({
    url: browser.runtime.getURL('minimal_full_page.html'),
    type: 'popup',
    width: 650,
    height: 800
  }).then((newWindow) => {
    // If window created successfully, close this popup
    console.log('Created window with ID:', newWindow.id);
    window.close();
  }).catch((error) => {
    console.error('Error creating window with direct method:', error);
    
    // Try second method - ask background script to open it
    browser.runtime.sendMessage({ action: 'openApp' }).then((response) => {
      if (response && response.success) {
        // Success - background will handle it
        window.close();
      } else {
        showStatus('Failed to open. Try reloading the extension.');
      }
    }).catch((msgError) => {
      console.error('Error with background method:', msgError);
      showStatus('Failed to open. Try reloading the extension.');
    });
  });
}

// Execute when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded, auto-opening main window');
  
  // Automatically open the app without user interaction
  openFullPageApp();
  
  // Set up click handler for the entire popup as a fallback
  document.body.addEventListener('click', (e) => {
    if (!e.target.matches('a')) { // Don't intercept link clicks
      openFullPageApp();
    }
  });
});
