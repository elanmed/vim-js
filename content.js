const extension = typeof browser !== "undefined" ? browser : chrome;

const labels = genLabels();

let activeToasts = [];

let firstKey = null;
let firstKeyTimeout = null;

let seekActive = false;
let seekFirstLabelKey = null;
let seekSecondLabelKey = null;
let seekLabels = [];

function resetSeekState() {
  seekActive = false;
  seekFirstLabelKey = null;
  seekSecondLabelKey = null;

  removeLabelElements();
  seekLabels = [];
}

const twoKeyKeymaps = ["gg", "yy"];

document.addEventListener("keydown", (event) => {
  if (
    event.target.tagName === "INPUT" ||
    event.target.tagName === "TEXTAREA" ||
    event.target.role === "textbox" ||
    event.target.isContentEditable ||
    event.target.tagName === "SELECT"
  ) {
    return;
  }

  if (seekActive) {
    handleSeek(event);
    return;
  }

  if (firstKey === null) {
    const isFirstKeyOfKeymap = twoKeyKeymaps.some((keymap) =>
      keymap.startsWith(event.key),
    );
    if (isFirstKeyOfKeymap) {
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
    case "s": {
      // extension.runtime.sendMessage({ action: "seek-initiate" });
      addLabelElements();
      seekActive = true;
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
  const styles = {
    position: "fixed",
    bottom: `${20 + activeToasts.length * 60}px`,
    right: "20px",
    background: "black",
    color: "white",
    padding: "12px",
    borderRadius: "4px",
    zIndex: "999999",
  };

  for (const [property, value] of Object.entries(styles)) {
    toast.style[property] = value;
  }
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

/**
 * @param {KeyboardEvent} event
 */
function handleSeek(event) {
  if (event.key === "Escape") {
    resetSeekState();
    addToast("Exiting seek");
    return;
  }

  if (seekFirstLabelKey) {
    seekSecondLabelKey = event.key;
    const selectedLabelText = seekFirstLabelKey.concat(event.key);
    const selectedLabel = seekLabels.find(
      ({ labelText }) => labelText === selectedLabelText,
    );
    if (!selectedLabel) {
      addToast("Invalid label");
      resetSeekState();
      return;
    }

    selectedLabel.clickableElement.click();

    resetSeekState();
  } else {
    seekFirstLabelKey = event.key;
    const labelTexts = seekLabels.map(({ labelText }) => labelText);
    if (
      !labelTexts.some((labelText) => labelText.startsWith(seekFirstLabelKey))
    ) {
      addToast("Invalid label");
      resetSeekState();
      return;
    }
  }
}

function addLabelElements() {
  const selectors = [
    "a",
    "button",
    'input[type="button"]',
    'input[type="submit"]',
    '[role="button"]',
    "[onclick]",
  ];

  const elements = Array.from(document.querySelectorAll(selectors.join(", ")));
  const clickableElements = elements.filter((element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  });
  const elementsWithLabelText = clickableElements.map((element, idx) => {
    return {
      labelText: labels[idx],
      clickableElement: element,
    };
  });
  elementsWithLabelText.forEach(({ clickableElement, labelText }) => {
    const range = document.createRange();
    range.selectNodeContents(clickableElement);
    const rect = range.getBoundingClientRect();

    const computedStyle = window.getComputedStyle(clickableElement);
    const fontSize = computedStyle.fontSize;

    const labelElement = document.createElement("div");
    seekLabels.push({ labelElement, clickableElement, labelText: labelText });
    labelElement.textContent = labelText;
    const styles = {
      background: "gold",
      color: "black",
      padding: "0 1px",
      borderRadius: "2px",
      zIndex: "999999",
      position: "fixed",
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      fontSize,
    };

    for (const [property, value] of Object.entries(styles)) {
      labelElement.style[property] = value;
    }
    document.body.appendChild(labelElement);
  });
}

function removeLabelElements() {
  seekLabels.forEach(({ labelElement }) => {
    labelElement.remove();
  });
}

function genLabels() {
  // TODO: avoid two letters on one hand
  const labelChars = "fjdkslgha;rueiwotyqpvbcnxmz";
  const labels = [];
  for (const labelCharOne of labelChars) {
    for (const labelCharTwo of labelChars) {
      if (labelCharOne === labelCharTwo) continue;
      labels.push(labelCharOne.concat(labelCharTwo));
    }
  }
  return labels;
}
