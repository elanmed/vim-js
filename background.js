let currTabId = null;
let prevTabId = null;

chrome.tabs.onActivated.addListener((activeInfo) => {
  prevTabId = currTabId;
  currTabId = activeInfo.tabId;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "TODO": {
      break;
    }
  }
});

chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case "switch-to-prev-tab": {
      chrome.tabs.get(prevTabId, (tab) => {
        chrome.windows.update(tab.windowId, { focused: true });
        chrome.tabs.update(prevTabId, { active: true });
      });
      break;
    }
    case "scroll-down": {
      chrome.scripting.executeScript({
        target: { tabId: currTabId },
        func: () => {
          window.scrollBy({
            behavior: "smooth",
            top: Math.floor(window.innerHeight / 2),
          });
        },
      });
      break;
    }
    case "scroll-up": {
      chrome.scripting.executeScript({
        target: { tabId: currTabId },
        func: () => {
          window.scrollBy({
            behavior: "smooth",
            top: -Math.floor(window.innerHeight / 2),
          });
        },
      });
      break;
    }
  }
});
