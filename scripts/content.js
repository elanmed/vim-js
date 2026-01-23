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
  }
}
