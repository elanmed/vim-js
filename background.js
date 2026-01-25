const extension = typeof browser === "undefined" ? chrome : browser;

let _currTabId = null;
let prevTabId = null;

extension.tabs.onActivated.addListener((activeInfo) => {
  prevTabId = _currTabId;
  _currTabId = activeInfo.tabId;
});

extension.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  handleMessageOrCommand(request.action);
});

extension.commands.onCommand.addListener((command) => {
  handleMessageOrCommand(command);
});

async function getCurrTabId() {
  const [tab] = await extension.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return tab?.id;
}

/**
 * @param {string} messageOrCommand
 */
async function handleMessageOrCommand(messageOrCommand) {
  switch (messageOrCommand) {
    case "switch-to-prev-tab": {
      extension.tabs.get(prevTabId, (tab) => {
        extension.windows.update(tab.windowId, { focused: true });
        extension.tabs.update(prevTabId, { active: true });
      });
      break;
    }
    case "scroll-down": {
      const currTabId = await getCurrTabId();
      extension.tabs.sendMessage(currTabId, {
        action: "scroll-down",
      });
      break;
    }
    case "scroll-up": {
      const currTabId = await getCurrTabId();
      extension.tabs.sendMessage(currTabId, {
        action: "scroll-up",
      });
      break;
    }
    case "switch-to-right-tab": {
      const currTabId = await getCurrTabId();
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
      const currTabId = await getCurrTabId();
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
      const currTabId = await getCurrTabId();
      extension.tabs.sendMessage(currTabId, {
        action: "scroll-to-bottom",
      });
      break;
    }
    case "scroll-to-top": {
      const currTabId = await getCurrTabId();
      extension.tabs.sendMessage(currTabId, {
        action: "scroll-to-top",
      });
      break;
    }
    case "copy-href-to-clipboard": {
      const currTabId = await getCurrTabId();
      extension.tabs.sendMessage(currTabId, {
        action: "copy-href-to-clipboard",
      });
      break;
    }
    case "seek-initiate": {
      const currTabId = await getCurrTabId();
      extension.tabs.sendMessage(currTabId, {
        action: "seek-initiate",
      });
      break;
    }
    case "unfocus": {
      const currTabId = await getCurrTabId();
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

