const extension = typeof browser === "undefined" ? chrome : browser;

async function getContentKeymaps() {
  const url = chrome.runtime.getURL("content-keymaps.json");
  let response;
  try {
    response = await fetch(url);
  } catch (e) {
    addToast(`Error fetching content-keymaps.json: ${JSON.stringify(e)}`);
    return [];
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    addToast(`Error parsing content-keymaps.json: ${JSON.stringify(e)}`);
    return [];
  }

  return data;
}

const labels = genLabels();

let activeToasts = [];

let recordedKeyEvents = [];
let recordingTimeout = null;

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

document.addEventListener("scroll", () => resetSeekState());
document.addEventListener("resize", () => resetSeekState());

document.addEventListener("keydown", async (event) => {
  if (seekActive) {
    handleSeek(event);
    return;
  }

  const keymaps = await getContentKeymaps();
  const multiKeyKeymaps = keymaps.filter((keymap) => Array.isArray(keymap));
  const singleKeyKeymaps = keymaps.filter((keymap) => !Array.isArray(keymap));

  if (
    event.target.tagName === "INPUT" ||
    event.target.tagName === "TEXTAREA" ||
    event.target.role === "textbox" ||
    event.target.isContentEditable ||
    event.target.tagName === "SELECT"
  ) {
    return;
  }

  recordedKeyEvents.push(event);
  clearTimeout(recordingTimeout);

  const matchedSubsetMultiKeyKeymap = multiKeyKeymaps.find((keymapArr) => {
    if (recordedKeyEvents.length > keymapArr.length) return false;
    return recordedKeyEvents.every((previousKeyEvent, idx) =>
      isSameKey(keymapArr[idx], previousKeyEvent),
    );
  });
  const isSubsetOfMultiKeyKeymap =
    matchedSubsetMultiKeyKeymap &&
    recordedKeyEvents.length < matchedSubsetMultiKeyKeymap.length;

  if (matchedSubsetMultiKeyKeymap) {
    if (isSubsetOfMultiKeyKeymap) {
      event.preventDefault();

      recordingTimeout = setTimeout(() => {
        addToast(
          `Clearing recorded keys: ${recordedKeyEvents.map((keyEvent) => keyEvent.key)}`,
        );
        recordedKeyEvents = [];
      }, 2000);
      return;
    }

    const { command } =
      matchedSubsetMultiKeyKeymap[matchedSubsetMultiKeyKeymap.length - 1];
    handleMessage(command);

    recordedKeyEvents = [];
  } else {
    recordedKeyEvents = [];
    const matchingKeymap = singleKeyKeymaps.find((keymap) =>
      isSameKey(keymap, event),
    );
    if (!matchingKeymap) return;
    extension.runtime.sendMessage({ action: matchingKeymap.command });
  }
});

/**
 * @param {string} message
 */
function handleMessage(message) {
  switch (message) {
    case "seek-initiate": {
      addLabelElements();
      seekActive = true;
      break;
    }
    case "copy-href-to-clipboard": {
      navigator.clipboard.writeText(window.location.href);
      addToast("URL copied");
      break;
    }
    case "scroll-down": {
      getScrollableBaseElement({ defaultBase: window }).scrollBy({
        behavior: "smooth",
        top: Math.floor(window.innerHeight / 2),
      });
      break;
    }
    case "scroll-up": {
      getScrollableBaseElement({ defaultBase: window }).scrollBy({
        behavior: "smooth",
        top: -Math.floor(window.innerHeight / 2),
      });
      break;
    }
    case "scroll-to-bottom": {
      getScrollableBaseElement({ defaultBase: window }).scrollTo({
        behavior: "instant",
        top: document.documentElement.scrollHeight,
      });
      break;
    }
    case "scroll-to-top": {
      getScrollableBaseElement({ defaultBase: window }).scrollTo({
        behavior: "instant",
        top: 0,
      });
      break;
    }
  }
}

extension.runtime.onMessage.addListener((request) => {
  handleMessage(request.action);
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
    fontFamily: "Helvetica",
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
  event.preventDefault();

  if (event.key === "Escape") {
    resetSeekState();
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

    selectedLabel.clickableElement.focus();
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
  const baseElement = getBaseElement({ defaultBase: document });
  const clickableSelectors = [
    "a",
    "button",
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="checkbox"]',
    'input[type="radio"]',
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[role="textbox"]',
    "[onclick]",
    "select",
    "summary",
    "input",
    "textarea",
    "label",
  ];

  const clickableElements = Array.from(
    baseElement.querySelectorAll(clickableSelectors.join(", ")),
  );
  const visibleElements = clickableElements.filter(isElementVisible);
  const elementsWithLabelText = visibleElements.map((element, idx) => {
    return {
      labelText: labels[idx + 1],
      clickableElement: element,
    };
  });
  elementsWithLabelText.unshift({
    labelText: labels[0],
    clickableElement: document.body,
  });

  elementsWithLabelText.forEach(({ clickableElement, labelText }) => {
    const rect = clickableElement.getBoundingClientRect();

    const computedStyle = window.getComputedStyle(clickableElement);
    const fontSize = computedStyle.fontSize;

    const labelElement = document.createElement("span");
    seekLabels.push({ labelElement, clickableElement, labelText: labelText });
    labelElement.textContent = labelText;
    const styles = {
      lineHeight: "1",
      background: "gold",
      color: "black",
      padding: "2px",
      opacity: "0.90",
      borderRadius: "2px",
      zIndex: "999999",
      position: "fixed",
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      fontSize,
      fontFamily: "monospace",
      fontWeight: "600",
      letterSpacing: "0.15em",
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
  const leftLabelChars = "fdsgarewtqvcxz";
  const rightLabelChars = "jklh;uioypnm";
  const labels = [];

  for (const labelCharOne of leftLabelChars) {
    for (const labelCharTwo of rightLabelChars) {
      labels.push(labelCharOne.concat(labelCharTwo));
    }
  }
  return labels;
}

/**
 * @param {Element} element
 */
function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);

  if (rect.width === 0 || rect.height === 0) return false;
  if (computedStyle.visibility === "hidden") return false;
  if (computedStyle.display === "none") return false;
  if (computedStyle.opacity === "0") return false;

  if (
    rect.top >= window.innerHeight ||
    rect.bottom <= 0 ||
    rect.left >= window.innerWidth ||
    rect.right <= 0
  ) {
    return false;
  }

  return true;
}

/**
 * @param {Object} params
 * @param {Element} params.defaultBase
 */
function getBaseElement({ defaultBase }) {
  const dialogSelectors = ["dialog", '[role="dialog"]', '[role="alertdialog"]'];
  const dialogElements = Array.from(
    document.querySelectorAll(dialogSelectors.join(", ")),
  );
  const visibleElements = dialogElements.filter(isElementVisible);
  if (visibleElements.length) return visibleElements[0];
  return defaultBase;
}

/**
 * @param {Element} element
 */
function isElementScrollable(element) {
  const { overflowY } = window.getComputedStyle(element);
  const { scrollHeight, clientHeight } = element;

  const allowsOverflow = overflowY === "scroll" || overflowY === "auto";
  return allowsOverflow && scrollHeight > clientHeight;
}

/**
 * @param {Element} element
 */
function getFirstScrollableChild(element) {
  if (isElementScrollable(element)) return element;
  for (const child of element.children) {
    const scrollableChild = getFirstScrollableChild(child);
    if (scrollableChild) return scrollableChild;
  }
  return undefined;
}

/**
 * @param {Object} params
 * @param {Element} params.defaultBase
 */
function getScrollableBaseElement({ defaultBase }) {
  const baseElement = getBaseElement({ defaultBase });
  if (baseElement === defaultBase) return defaultBase;

  return getFirstScrollableChild(baseElement);
}

/**
 * @param {KeyboardEvent} event
 * @param {Object} keymap
 * @param {boolean} keymap.altKey
 * @param {boolean} keymap.ctrlKey
 * @param {boolean} keymap.metaKey
 * @param {boolean} keymap.shiftKey
 * @param {string} keymap.key
 * @param {string} keymap.command
 */
function isSameKey(keymap, event) {
  return (
    event.altKey === (keymap.altKey ?? false) &&
    event.ctrlKey === (keymap.ctrlKey ?? false) &&
    event.metaKey === (keymap.metaKey ?? false) &&
    event.shiftKey === (keymap.shiftKey ?? false) &&
    event.key === keymap.key
  );
}
