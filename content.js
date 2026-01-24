const extension = typeof browser !== "undefined" ? browser : chrome;

let activeToasts = [];
let firstKey = null;
let firstKeyTimeout = null;

const twoKeyKeymaps = ["gg", "yy"];

document.addEventListener("keydown", (event) => {
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
    return;
  }

  if (firstKey === null) {
    const isFirstKeyOfKeymap = twoKeyKeymaps.some((keymap) =>
      keymap.startsWith(event.key),
    );
    if (isFirstKeyOfKeymap) {
      // TODO: set a timeout?
      firstKey = event.key;

      firstKeyTimeout = setTimeout(() => {
        addToast(`Clearing first key: ${firstKey}`);
        firstKey = null;
      }, 2000);

      return;
    }
    if (event.key === "Shift") return;

    handleSingleKeyKeymap(event);
  } else {
    clearTimeout(firstKeyTimeout);

    handleTwoKeyKeymap(event, firstKey);
    firstKey = null;
  }
});

/**
 * @param {KeyboardEvent} event
 */
function handleSingleKeyKeymap(event) {
  switch (event.key) {
    case "H": {
      extension.runtime.sendMessage({ action: "switch-to-first-tab" });
      break;
    }
    case "L": {
      extension.runtime.sendMessage({ action: "switch-to-last-tab" });
      break;
    }
    case "G": {
      extension.runtime.sendMessage({ action: "scroll-to-bottom" });
      break;
    }
  }
}

/**
 * @param {KeyboardEvent} event
 * @param {string} firstKey
 */
function handleTwoKeyKeymap(event, firstKey) {
  switch (firstKey.concat(event.key)) {
    case "gg": {
      extension.runtime.sendMessage({ action: "scroll-to-top" });
      break;
    }
    case "yy": {
      extension.runtime.sendMessage({ action: "copy-href-to-clipboard" });
    }
  }
}

extension.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  switch (request.action) {
    case "show-toast": {
      addToast(request.message);
    }
  }
});

/**
 * @param {string} message
 */
function addToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `position:fixed;bottom:${20 + activeToasts.length * 60}px;right:20px;background:black;color:white;padding:12px;border-radius:4px;z-index:999999;`;
  document.body.appendChild(toast);
  activeToasts.push(toast);

  setTimeout(() => {
    const toastIndex = activeToasts.indexOf(toast);
    if (toastIndex === -1) return;

    activeToasts.splice(toastIndex, 1);
    toast.remove();

    activeToasts.forEach((toast, index) => {
      toast.style.bottom = `${20 + index * 60}px`;
    });
  }, 2000);
}

