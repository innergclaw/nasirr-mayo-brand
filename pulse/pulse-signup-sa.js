// Keeps the Style A heading label honest. pulse.js replaces the heading text on each step,
// which drops the word spans; when that happens the aria-label is removed so the new text is read.
const title = document.getElementById("panel-title");
if (title) {
  new MutationObserver(() => {
    if (!title.querySelector(".w")) title.removeAttribute("aria-label");
  }).observe(title, { childList: true });
}
