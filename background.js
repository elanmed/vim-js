const extension = typeof browser !== "undefined" ? browser : chrome;

let currTabId = null;
let prevTabId = null;

extension.tabs.onActivated.addListener((activeInfo) => {
  prevTabId = currTabId;
  currTabId = activeInfo.tabId;
});

extension.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  handleMessageOrCommand(request.action);
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
      extension.tabs.sendMessage(currTabId, {
        action: "scroll-down",
      });
      break;
    }
    case "scroll-up": {
      extension.tabs.sendMessage(currTabId, {
        action: "scroll-up",
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
      extension.tabs.sendMessage(currTabId, {
        action: "scroll-to-bottom",
      });
      break;
    }
    case "scroll-to-top": {
      extension.tabs.sendMessage(currTabId, {
        action: "scroll-to-top",
      });
      break;
    }
    case "copy-href-to-clipboard": {
      extension.tabs.sendMessage(currTabId, {
        action: "copy-href-to-clipboard",
      });
      break;
    }
    case "seek-initiate": {
      extension.tabs.sendMessage(currTabId, {
        action: "seek-initiate",
      });
      break;
    }
    case "unfocus": {
      extension.tabs.sendMessage(currTabId, {
        action: "unfocus",
      });
      break;
    }
    case "history-back": {
      extension.tabs.goBack();
      break;
    }
    case "history-forward": {
      extension.tabs.goForward();
      break;
    }
  }
}

