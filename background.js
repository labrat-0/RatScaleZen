/**
 * RatForge Background Script
 * Left-click: opens full page tool in a browser tab
 * Right-click context menu: Quick Export (common dev sizes)
 * Firefox Manifest V2, browser.* APIs
 */

const MAIN_PAGE = browser.runtime.getURL('minimal_full_page.html');
const QUICK_PAGE = browser.runtime.getURL('quick_export.html');

// Left-click: open or focus existing tab
browser.browserAction.onClicked.addListener(async () => {
  const tabs = await browser.tabs.query({});
  const existing = tabs.find(t => t.url === MAIN_PAGE);
  if (existing) {
    browser.tabs.update(existing.id, { active: true });
    browser.windows.update(existing.windowId, { focused: true });
  } else {
    browser.tabs.create({ url: MAIN_PAGE });
  }
});

// Context menu: Quick Export
browser.menus.create({
  id: 'ratforge-quick-export',
  title: 'Quick Export',
  contexts: ['browser_action']
});

browser.menus.onClicked.addListener((info) => {
  if (info.menuItemId === 'ratforge-quick-export') {
    browser.tabs.create({ url: QUICK_PAGE });
  }
});

// Handle messages from app pages
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'open_app') {
    browser.tabs.create({ url: MAIN_PAGE });
    sendResponse({ success: true });
    return true;
  }
  return false;
});

// On install: open welcome tab
browser.runtime.onInstalled.addListener((details) => {
  browser.storage.local.set({ installTime: Date.now() });
  if (details.reason === 'install') {
    browser.tabs.create({ url: MAIN_PAGE + '?welcome=true' });
  }
});
