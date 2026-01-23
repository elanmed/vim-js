let currTabId = null;
let prevTabId = null;

chrome.tabs.onActivated.addListener((activeInfo) => {
  prevTabId = currTabId;
  currTabId = activeInfo.tabId;
});

chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  switch (request.action) {
    case "switchToFirstTab": {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        console.log("switching to first");
        chrome.tabs.update(tabs[0].id, { active: true });
      });
      break;
    }
    case "switchToLastTab": {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        chrome.tabs.update(tabs[tabs.length - 1].id, { active: true });
      });
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
    case "switch-to-right-tab": {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const currIdx = tabs.findIndex((tab) => tab.id === currTabId);
        const rightIdx = (() => {
          if (currIdx === tabs.length - 1) return 0;
          return currIdx + 1;
        })();
        chrome.tabs.update(tabs[rightIdx].id, { active: true });
      });
      break;
    }
    case "switch-to-left-tab": {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const currIdx = tabs.findIndex((tab) => tab.id === currTabId);
        const leftIdx = (() => {
          if (currIdx === 0) return tabs.length - 1;
          return currIdx - 1;
        })();
        chrome.tabs.update(tabs[leftIdx].id, { active: true });
      });
      break;
    }
  }
});
