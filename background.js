/**
 * RatScaleZen Background Script
 * Handles extension icon clicks and window management
 * Converted for Firefox/Zen Browser (Manifest V2, browser.* APIs)
 */

// Track active application window
let activeRatScaleZenWindow = null;

// Check if window exists and is still open
async function windowExists(windowId) {
  if (!windowId) return false;
  
  try {
    const win = await browser.windows.get(windowId);
    return Boolean(win);
  } catch (error) {
    console.log('Window check error:', error.message);
    return false;
  }
}

// Create a new application window
async function createAppWindow() {
  console.log('Creating new RatScaleZen application window');
  
  // Modern dimensions for the application window
  const windowWidth = 720;
  const windowHeight = 820;
  
  try {
    const newWindow = await browser.windows.create({
      url: browser.runtime.getURL('minimal_full_page.html'),
      type: 'popup',
      width: windowWidth,
      height: windowHeight
    });
    
    activeRatScaleZenWindow = newWindow.id;
    console.log(`Created RatScaleZen window with ID: ${activeRatScaleZenWindow}`);
    
    // Store window ID in local storage
    await browser.storage.local.set({
      activeWindowId: activeRatScaleZenWindow,
      lastOpenTime: Date.now()
    });
    
    return newWindow;
  } catch (error) {
    console.error('Failed to create window:', error);
    return null;
  }
}

// Handle extension icon click
browser.browserAction.onClicked.addListener(async () => {
  console.log('Extension icon clicked!');
  
  // Check if we already have a window open
  if (activeRatScaleZenWindow) {
    try {
      await browser.windows.get(activeRatScaleZenWindow);
      // Window exists, focus it
      try {
        await browser.windows.update(activeRatScaleZenWindow, { focused: true });
      } catch (focusError) {
        console.log('Error focusing window, creating new one');
        await createAppWindow();
      }
      return;
    } catch (error) {
      console.log('Saved window no longer exists, creating new one');
      activeRatScaleZenWindow = null;
      await createAppWindow();
      return;
    }
  }
  
  // Check storage for window ID
  try {
    const data = await browser.storage.local.get(['activeWindowId']);
    if (data.activeWindowId) {
      try {
        await browser.windows.get(data.activeWindowId);
        // Window exists, save ID and focus it
        activeRatScaleZenWindow = data.activeWindowId;
        try {
          await browser.windows.update(activeRatScaleZenWindow, { focused: true });
        } catch (focusError) {
          await createAppWindow();
        }
      } catch (error) {
        // Stored window doesn't exist anymore, create new one
        await createAppWindow();
      }
    } else {
      // No window ID in storage, create new one
      await createAppWindow();
    }
  } catch (error) {
    console.error('Error checking storage:', error);
    await createAppWindow();
  }
});

// Keep track of window removal
browser.windows.onRemoved.addListener((windowId) => {
  if (windowId === activeRatScaleZenWindow) {
    console.log(`RatScaleZen window ${windowId} was closed`);
    activeRatScaleZenWindow = null;
    browser.storage.local.remove('activeWindowId');
  }
});

// Handle initialization message from app window
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'init_window') {
    // Store the window ID when the app initializes
    if (sender.tab && sender.tab.windowId) {
      activeRatScaleZenWindow = sender.tab.windowId;
      console.log(`Registered app window ID: ${activeRatScaleZenWindow}`);
      
      // Store in local storage
      browser.storage.local.set({
        activeWindowId: activeRatScaleZenWindow,
        lastOpenTime: Date.now()
      });
      
      sendResponse({ success: true, windowId: activeRatScaleZenWindow });
    }
    return true;
  }
  
  if (message.action === 'open_app') {
    console.log('Received request to open app window');
    createAppWindow().then((win) => {
      sendResponse({ 
        success: Boolean(win), 
        windowId: win ? win.id : null 
      });
    });
    return true;
  }
  
  return false;
});

// Initialize on installation
browser.runtime.onInstalled.addListener((details) => {
  console.log(`RatScaleZen installed: ${details.reason}`);
  
  // Set default settings
  browser.storage.local.set({
    isProcessing: false,
    progress: 0,
    lastUsed: null,
    theme: 'default',
    installTime: Date.now()
  });
  
  // Open welcome page on fresh install
  if (details.reason === 'install') {
    const url = browser.runtime.getURL('minimal_full_page.html?welcome=true');
    browser.tabs.create({ url });
  }
});
