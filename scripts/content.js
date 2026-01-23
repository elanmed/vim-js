document.addEventListener("keydown", (event) => {
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
    return;
  }

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
  }
});
