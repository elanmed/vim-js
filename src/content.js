const extension = typeof browser === "undefined" ? chrome : browser;

const labels = genLabels();

const state = {
  activeToasts: [],
  contentKeymaps: null,
  recording: {
    keyEvents: [],
    timeout: null,
  },
  scrollPageCallback: null,
  seek: {
    mode: "off",
    firstLabelKey: null,
    secondLabelKey: null,
    labels: [],
  },
};

window.addEventListener("__vimJsTestCommand", (event) => {
  extension.runtime.sendMessage({ action: event.detail.action });
});

/**
 * @param { "click" | "focus" } mode
 */
function activateSeek(mode) {
  state.seek.mode = mode;
  addLabelElements();
  chrome.storage.local.set({ seekMode: state.seek.mode });
}

function deactivateSeek() {
  resetSeekLabelsAndKeys();
  state.seek.mode = "off";
  chrome.storage.local.set({ seekMode: "off" });
}

function isSeekActive() {
  return state.seek.mode === "focus" || state.seek.mode === "click";
}

function resetSeekLabelsAndKeys() {
  state.seek.firstLabelKey = null;
  state.seek.secondLabelKey = null;

  removeLabelElements();
  state.seek.labels = [];
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

window.addEventListener("keydown", async (event) => {
  if (isSeekActive()) {
    if (!isEventTypeableChar(event)) return;

    event.preventDefault();
    handleSeek(event);
    return;
  }

  // Don't need this check in background.js since all command keymaps are non-typeable
  if (
    isEventTypeableChar(event) &&
    // composedPath() is used instead of event.target to handle shadow DOM retargeting
    event.composedPath().some(isTypeableElement)
  ) {
    return;
  }

  if (!state.contentKeymaps) {
    state.contentKeymaps = await getContentKeymaps();
  }
  const multiKeyKeymaps = state.contentKeymaps.filter((keymap) =>
    Array.isArray(keymap),
  );
  const singleKeyKeymaps = state.contentKeymaps.filter(
    (keymap) => !Array.isArray(keymap),
  );

  state.recording.keyEvents.push(event);
  clearTimeout(state.recording.timeout);

  const matchedSubsetMultiKeyKeymap = multiKeyKeymaps.find((keymapArr) => {
    if (state.recording.keyEvents.length > keymapArr.length) return false;
    return state.recording.keyEvents.every((previousKeyEvent, idx) =>
      isSameKey(keymapArr[idx], previousKeyEvent),
    );
  });
  const isSubsetOfMultiKeyKeymap =
    matchedSubsetMultiKeyKeymap &&
    state.recording.keyEvents.length < matchedSubsetMultiKeyKeymap.length;

  if (matchedSubsetMultiKeyKeymap) {
    event.preventDefault();

    if (isSubsetOfMultiKeyKeymap) {
      state.recording.timeout = setTimeout(() => {
        addToast(
          `Clearing recorded keys: ${state.recording.keyEvents.map((keyEvent) => keyEvent.key)}`,
        );
        state.recording.keyEvents = [];
      }, 2000);
      return;
    }

    const { command } = matchedSubsetMultiKeyKeymap.at(-1);
    extension.runtime.sendMessage({ action: command });

    state.recording.keyEvents = [];
  } else {
    state.recording.keyEvents = [];
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
    bottom: `${20 + state.activeToasts.length * 60}px`,
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
  state.activeToasts.push(toast);

  setTimeout(() => {
    const toastIndex = state.activeToasts.indexOf(toast);
    if (toastIndex === -1) return;

    state.activeToasts.splice(toastIndex, 1);
    toast.remove();

    state.activeToasts.forEach((toast, index) => {
      toast.style.bottom = `${20 + index * 60}px`;
    });
  }, 2000);
}

/**
 * @param {KeyboardEvent} event
 */
function handleSeek(event) {
  if (state.seek.firstLabelKey) {
    const selectedLabelText = state.seek.firstLabelKey.concat(event.key);
    const selectedLabel = state.seek.labels.find(
      ({ labelText }) => labelText === selectedLabelText,
    );
    if (!selectedLabel) {
      addToast("Invalid label");
      state.seek.firstLabelKey = null;
      return;
    }
    state.seek.secondLabelKey = event.key;

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
    if (state.seek.mode === "click") {
      simulateClick(selectedLabel.labeledElement);

      if (isTypeableElement(selectedLabel.labeledElement)) {
        deactivateSeek();
        addToast("Disabling seek");
        return;
      } else {
        resetSeekLabelsAndKeys();
        return;
      }
    }

    if (state.seek.mode === "focus") {
      const scrollableParent = getFirstScrollableParent(document.activeElement);
      if (scrollableParent && state.scrollPageCallback) {
        state.scrollPageCallback(scrollableParent);
        state.scrollPageCallback = null;
      }
      deactivateSeek();
      return;
    }
  } else {
    const labelTexts = state.seek.labels.map(({ labelText }) => labelText);
    if (!labelTexts.some((labelText) => labelText.startsWith(event.key))) {
      addToast("Invalid label");
      return;
    }
    state.seek.firstLabelKey = event.key;
  }
}

function addLabelElements() {
  const baseElement = getModalElement() ?? document;
  let elementsToLabel;
  if (state.seek.mode === "click") {
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
      querySelectorAllWithShadow(baseElement, clickableSelectors.join(", ")),
    );

    if (!clickableElements.includes(document.documentElement)) {
      clickableElements.unshift(document.documentElement);
    }

    elementsToLabel = clickableElements;
  } else {
    const allElements = Array.from(querySelectorAllWithShadow(document, "*"));
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
    addToast(`No elements to ${state.seek.mode}`);
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
    state.seek.labels.push({ labelElement, labeledElement, labelText });
    labelElement.textContent = labelText;
    const styles = {
      lineHeight: "1",
      background: state.seek.mode === "click" ? "gold" : "lightgreen",
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
  state.seek.labels.forEach(({ labelElement }) => {
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
    querySelectorAllWithShadow(document, dialogSelectors.join(", ")),
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
  state.scrollPageCallback = callback;

  if (isSeekActive()) {
    deactivateSeek();
    return;
  }

  const modalElement = getModalElement();
  if (modalElement) {
    const scrollableChild = getFirstScrollableChild(modalElement);
    if (scrollableChild) {
      callback(scrollableChild);
      state.scrollPageCallback = null;
    }
    return;
  }

  const scrollableParent = getFirstScrollableParent(document.activeElement);
  if (scrollableParent) {
    callback(scrollableParent);
    state.scrollPageCallback = null;
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

/**
 * @param {Element} element
 */
function isTypeableElement(element) {
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.role === "textbox" ||
    element.tagName === "SELECT" ||
    element.isContentEditable
  );
}

/**
 * @param {Element} root
 * @param {string} selector
 */
function querySelectorAllWithShadow(root, selector) {
  const matchedElements = Array.from(root.querySelectorAll(selector));
  for (const element of root.querySelectorAll("*")) {
    if (element.shadowRoot) {
      matchedElements.push(
        ...querySelectorAllWithShadow(element.shadowRoot, selector),
      );
    }
  }
  return matchedElements;
}

/**
 * @param {Element} element
 */
function simulateClick(element) {
  const rect = element.getBoundingClientRect();
  const clientX = rect.left + rect.width / 2;
  const clientY = rect.top + rect.height / 2;
  const eventInit = { bubbles: true, cancelable: true, clientX, clientY };

  for (const type of [
    "pointerdown",
    "mousedown",
    "pointerup",
    "mouseup",
    "click",
  ]) {
    const EventConstructor = type.startsWith("pointer")
      ? PointerEvent
      : MouseEvent;
    element.dispatchEvent(new EventConstructor(type, eventInit));
  }
}
