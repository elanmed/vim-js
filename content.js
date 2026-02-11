const extension = typeof browser === "undefined" ? chrome : browser;

const labels = genLabels();

let contentKeymaps = null;

const activeToasts = [];

let recordedKeyEvents = [];
let recordingTimeout = null;

let scrollPageCallback = null;
let seekMode = "off";
let seekFirstLabelKey = null;
let seekSecondLabelKey = null;
let seekLabels = [];

/**
 * @param { "click" | "focus" } mode
 */
function activateSeek(mode) {
  seekMode = mode;
  addLabelElements();
  chrome.storage.local.set({ seekMode });
}

function deactivateSeek() {
  resetSeekLabelsAndKeys();
  seekMode = "off";
  chrome.storage.local.set({ seekMode: "off" });
}

function isSeekActive() {
  return seekMode === "focus" || seekMode === "click";
}

function resetSeekLabelsAndKeys() {
  seekFirstLabelKey = null;
  seekSecondLabelKey = null;

  removeLabelElements();
  seekLabels = [];
}

window.addEventListener("scroll", () => resetSeekLabelsAndKeys());
window.addEventListener("resize", () => resetSeekLabelsAndKeys());

window.addEventListener("load", async () => {
  const storedSeekMode = (await chrome.storage.local.get(["seekMode"]))
    ?.seekMode;
  if (storedSeekMode === "click" || storedSeekMode === "focus") {
    activateSeek(storedSeekMode);
  }
});

// window.addEventListener("beforeunload", () => {
//   resetSeekLabelsAndKeys();
// });

window.addEventListener("keydown", async (event) => {
  if (isSeekActive()) {
    if (!isEventTypeableChar(event)) return;

    event.preventDefault();
    handleSeek(event);
    return;
  }

  // Don't need this check in background.js since all command keymaps are non-typeable
  if (isEventTypeableChar(event) && isTypeableElement(event.target)) return;

  if (!contentKeymaps) {
    contentKeymaps = await getContentKeymaps();
  }
  const multiKeyKeymaps = contentKeymaps.filter((keymap) =>
    Array.isArray(keymap),
  );
  const singleKeyKeymaps = contentKeymaps.filter(
    (keymap) => !Array.isArray(keymap),
  );

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
    event.preventDefault();

    if (isSubsetOfMultiKeyKeymap) {
      recordingTimeout = setTimeout(() => {
        addToast(
          `Clearing recorded keys: ${recordedKeyEvents.map((keyEvent) => keyEvent.key)}`,
        );
        recordedKeyEvents = [];
      }, 2000);
      return;
    }

    const { command } = matchedSubsetMultiKeyKeymap.at(-1);
    extension.runtime.sendMessage({ action: command });

    recordedKeyEvents = [];
  } else {
    recordedKeyEvents = [];
    const matchingKeymap = singleKeyKeymaps.find((keymap) =>
      isSameKey(keymap, event),
    );
    if (!matchingKeymap) return;

    event.preventDefault();
    extension.runtime.sendMessage({ action: matchingKeymap.command });
  }
});

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

extension.runtime.onMessage.addListener((request) => {
  switch (request.action) {
    case "toggle-label-click": {
      if (isSeekActive()) {
        deactivateSeek();
      } else {
        activateSeek("click");
      }
      break;
    }
    case "toggle-label-focus": {
      if (isSeekActive()) {
        deactivateSeek();
      } else {
        activateSeek("focus");
      }
      break;
    }
    case "blur": {
      document.activeElement.blur();
      break;
    }
    case "copy-href-to-clipboard": {
      navigator.clipboard.writeText(window.location.href);
      addToast("URL copied");
      break;
    }
    case "scroll-down": {
      scrollPage((el) => {
        el.scrollBy({
          behavior: "smooth",
          top: Math.floor(window.innerHeight / 2),
        });
      });
      break;
    }
    case "scroll-up": {
      scrollPage((el) => {
        el.scrollBy({
          behavior: "smooth",
          top: -Math.floor(window.innerHeight / 2),
        });
      });
      break;
    }
    case "scroll-to-bottom": {
      scrollPage((el) => {
        el.scrollTo({
          behavior: "instant",
          top: el.scrollHeight,
        });
      });
      break;
    }
    case "scroll-to-top": {
      scrollPage((el) => {
        el.scrollTo({
          behavior: "instant",
          top: 0,
        });
      });
      break;
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
  if (seekFirstLabelKey) {
    const selectedLabelText = seekFirstLabelKey.concat(event.key);
    const selectedLabel = seekLabels.find(
      ({ labelText }) => labelText === selectedLabelText,
    );
    if (!selectedLabel) {
      addToast("Invalid label");
      seekFirstLabelKey = null;
      return;
    }
    seekSecondLabelKey = event.key;

    let observerTimeout = null;
    const domObserver = new MutationObserver((_mutationList, observer) => {
      clearTimeout(observerTimeout);
      observerTimeout = setTimeout(() => {
        if (!isSeekActive()) {
          observer.disconnect();
          return;
        }

        addLabelElements();

        observer.disconnect();
      }, 500);
    });

    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    selectedLabel.labeledElement.focus();
    if (seekMode === "click") {
      selectedLabel.labeledElement.click();

      if (isTypeableElement(selectedLabel.labeledElement)) {
        deactivateSeek();
        addToast("Disabling seek");
        return;
      } else {
        resetSeekLabelsAndKeys();
        return;
      }
    }

    if (seekMode === "focus") {
      const scrollableParent = getFirstScrollableParent(document.activeElement);
      if (scrollableParent && scrollPageCallback) {
        scrollPageCallback(scrollableParent);
        scrollPageCallback = null;
      }
      deactivateSeek();
      return;
    }
  }

  const labelTexts = seekLabels.map(({ labelText }) => labelText);
  if (!labelTexts.some((labelText) => labelText.startsWith(event.key))) {
    addToast("Invalid label");
    return;
  }
  seekFirstLabelKey = event.key;
}

function addLabelElements() {
  const baseElement = getModalElement() ?? document;
  let elementsToLabel;
  if (seekMode === "click") {
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

    if (!clickableElements.includes(document.documentElement)) {
      clickableElements.unshift(document.documentElement);
    }

    elementsToLabel = clickableElements;
  } else {
    const allElements = Array.from(document.querySelectorAll("*"));
    const scrollableElements = allElements.filter(isElementScrollable);

    if (!scrollableElements.includes(document.documentElement)) {
      scrollableElements.unshift(document.documentElement);
    }

    scrollableElements.forEach((element) => {
      if (!element.hasAttribute("tabindex")) {
        element.setAttribute("tabindex", "-1");
      }
    });

    elementsToLabel = scrollableElements;
  }

  if (elementsToLabel.length === 1) {
    addToast(`No elements to ${seekMode}`);
    return deactivateSeek();
  }

  const visibleElements = elementsToLabel.filter(isElementVisible);
  const elementsWithLabelText = visibleElements
    .slice(0, labels.length)
    .map((element, idx) => {
      return {
        labelText: labels[idx],
        labeledElement: element,
      };
    });

  elementsWithLabelText.forEach(({ labeledElement, labelText }) => {
    const rect = labeledElement.getBoundingClientRect();

    const computedStyle = window.getComputedStyle(labeledElement);
    const fontSize = computedStyle.fontSize;

    const labelElement = document.createElement("span");
    seekLabels.push({ labelElement, labeledElement, labelText });
    labelElement.textContent = labelText;
    const styles = {
      lineHeight: "1",
      background: seekMode === "click" ? "gold" : "lightgreen",
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

function getModalElement() {
  const dialogSelectors = ["dialog", '[role="dialog"]', '[role="alertdialog"]'];
  const dialogElements = Array.from(
    document.querySelectorAll(dialogSelectors.join(", ")),
  );
  const visibleElements = dialogElements.filter(isElementVisible);
  if (visibleElements.length) return visibleElements[0];
  return null;
}

/**
 * @param {Element} element
 */
function isElementScrollable(element) {
  const { overflowY } = window.getComputedStyle(element);
  const { scrollHeight, clientHeight } = element;

  const isScrollingElement = element === document.scrollingElement;
  const allowsOverflow =
    overflowY === "scroll" || overflowY === "auto" || isScrollingElement;
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
  return null;
}

/**
 * @param {Element} element
 */
function getFirstScrollableParent(element) {
  if (!element) return null;

  if (isElementScrollable(element)) return element;
  return getFirstScrollableParent(element.parentElement);
}

/**
 * @param {(element: Element) => void} callback
 */
function scrollPage(callback) {
  scrollPageCallback = callback;

  if (isSeekActive()) {
    deactivateSeek();
    return;
  }

  const modalElement = getModalElement();
  if (modalElement) {
    const scrollableChild = getFirstScrollableChild(modalElement);
    if (scrollableChild) {
      callback(scrollableChild);
      scrollPageCallback = null;
    }
    return;
  }

  const scrollableParent = getFirstScrollableParent(document.activeElement);
  if (scrollableParent) {
    callback(scrollableParent);
    scrollPageCallback = null;
    return;
  }

  activateSeek("focus");
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

/**
 * @param {KeyboardEvent} event
 */
function isEventTypeableChar(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return false;

  const lowerCase = "abcdefghijklmnopqrstuvwxyz";
  const upperCase = lowerCase.toUpperCase();
  const numbers = "0123456789";
  const punc = "`~!@#$%^&*()-=_+[]{};':\",./<>?";
  return `${lowerCase}${upperCase}${numbers}${punc}`.includes(event.key);
}

function isTypeableElement(element) {
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.role === "textbox" ||
    element.tagName === "SELECT" ||
    element.isContentEditable
  );
}
