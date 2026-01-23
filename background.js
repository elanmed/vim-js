let currTabId = null;
let prevTabId = null;

chrome.tabs.onActivated.addListener((activeInfo) => {
  prevTabId = currTabId;
  currTabId = activeInfo.tabId;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "switchToPrevTab": {
      chrome.tabs.get(prevTabId, (tab) => {
        chrome.windows.update(tab.windowId, { focused: true });
        chrome.tabs.update(prevTabId, { active: true });
      });
      break;
    }
  }
});
