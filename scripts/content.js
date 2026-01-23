document.addEventListener("keydown", (event) => {
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
    return;
  }

  if (event.key === "j") {
    window.scrollBy(0, 100);
  } else if (event.key === "k") {
    window.scrollBy(0, -100);
  }
});
