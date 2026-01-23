let activeToasts = [];
let firstKey = null;

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
    case "j": {
      window.scrollBy({
        behavior: "smooth",
        top: Math.floor(window.innerHeight / 2),
      });
      break;
    }
    case "k": {
      window.scrollBy({
        behavior: "smooth",
        top: -Math.floor(window.innerHeight / 2),
      });
      break;
    }
    case "G": {
      window.scrollBy({
        behavior: "instant",
        top: document.documentElement.scrollHeight,
      });
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

