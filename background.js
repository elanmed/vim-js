const extension = typeof browser !== "undefined" ? browser : chrome;

let currTabId = null;
let prevTabId = null;

function executeScript(callback) {
  extension.scripting.executeScript({
    target: { tabId: currTabId },
    func: callback,
  });
}

extension.tabs.onActivated.addListener((activeInfo) => {
  prevTabId = currTabId;
  currTabId = activeInfo.tabId;
});

extension.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  handleMessageOrCommand(request.action);
  switch (request.action) {
  }
});

extension.commands.onCommand.addListener((command) => {
  handleMessageOrCommand(command);
});

/**
 * @param {string} messageOrCommand
 */
function handleMessageOrCommand(messageOrCommand) {
  switch (messageOrCommand) {
    case "switch-to-prev-tab": {
      extension.tabs.get(prevTabId, (tab) => {
        extension.windows.update(tab.windowId, { focused: true });
        extension.tabs.update(prevTabId, { active: true });
      });
      break;
    }
    case "scroll-down": {
      executeScript(() => {
        window.scrollBy({
          behavior: "smooth",
          top: Math.floor(window.innerHeight / 2),
        });
      });
      break;
    }
    case "scroll-up": {
      executeScript(() => {
        window.scrollBy({
          behavior: "smooth",
          top: -Math.floor(window.innerHeight / 2),
        });
      });
      break;
    }
    case "switch-to-right-tab": {
      extension.tabs.query({ currentWindow: true }, (tabs) => {
        const currIdx = tabs.findIndex((tab) => tab.id === currTabId);
        const rightIdx = (() => {
          if (currIdx === tabs.length - 1) return 0;
          return currIdx + 1;
        })();
        extension.tabs.update(tabs[rightIdx].id, { active: true });
      });
      break;
    }
    case "switch-to-left-tab": {
      extension.tabs.query({ currentWindow: true }, (tabs) => {
        const currIdx = tabs.findIndex((tab) => tab.id === currTabId);
        const leftIdx = (() => {
          if (currIdx === 0) return tabs.length - 1;
          return currIdx - 1;
        })();
        extension.tabs.update(tabs[leftIdx].id, { active: true });
      });
      break;
    }
    case "switch-to-first-tab": {
      extension.tabs.query({ currentWindow: true }, (tabs) => {
        console.log("switching to first");
        extension.tabs.update(tabs[0].id, { active: true });
      });
      break;
    }
    case "switch-to-last-tab": {
      extension.tabs.query({ currentWindow: true }, (tabs) => {
        extension.tabs.update(tabs[tabs.length - 1].id, { active: true });
      });
      break;
    }
    case "scroll-to-bottom": {
      executeScript(() => {
        window.scrollBy({
          behavior: "instant",
          top: document.documentElement.scrollHeight,
        });
      });
      break;
    }
    case "scroll-to-top": {
      executeScript(() => {
        window.scrollBy({
          behavior: "instant",
          top: -document.documentElement.scrollHeight,
        });
      });
      break;
    }
    case "copy-href-to-clipboard": {
      executeScript(() => {
        navigator.clipboard.writeText(window.location.href);
      });
      extension.tabs.sendMessage(currTabId, {
        action: "show-toast",
        message: "URL copied",
      });
      break;
    }
  }
}
