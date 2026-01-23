let activeToasts = [];
let firstKey = null;

// TODO: handle holding shift between two keys
const twoKeyKeymaps = ["gg", "yy", "ShiftG", "ShiftH", "ShiftL"];

document.addEventListener("keydown", (event) => {
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
    return;
  }

  // console.log(event.key);
  if (firstKey === null) {
    const isFirstKeyOfKeymap = twoKeyKeymaps.some((keymap) =>
      keymap.startsWith(event.key),
    );
    if (isFirstKeyOfKeymap) {
      // TODO: set a timeout?
      firstKey = event.key;
      return;
    }

    handleSingleKeyKeymap(event);
  } else {
    handleTwoKeyKeymap(event, firstKey);
    firstKey = null;
  }
});

/**
 * @param {KeyboardEvent} event
 */
function handleSingleKeyKeymap(event) {
  switch (event.key) {
    case "l": {
      chrome.runtime.sendMessage({ action: "switchToRightTab" });
      break;
    }
    case "h": {
      chrome.runtime.sendMessage({ action: "switchToLeftTab" });
      break;
    }
  }
}

/**
 * @param {KeyboardEvent} event
 * @param {string} firstKey
 */
function handleTwoKeyKeymap(event, firstKey) {
  console.log(firstKey.concat(event.key));
  switch (firstKey.concat(event.key)) {
    case "gg": {
      window.scrollBy({
        behavior: "instant",
        top: -document.documentElement.scrollHeight,
      });
      break;
    }
    case "yy": {
      navigator.clipboard.writeText(window.location.href);
      addToast("URL copied");
    }
    case "ShiftH": {
      console.log("]T");
      chrome.runtime.sendMessage({ action: "switchToFirstTab" });
      break;
    }
    case "ShiftL": {
      chrome.runtime.sendMessage({ action: "switchToLastTab" });
      break;
    }
    case "ShiftG": {
      window.scrollBy({
        behavior: "instant",
        top: document.documentElement.scrollHeight,
      });
      break;
    }
  }
}

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

