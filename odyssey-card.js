(() => {
  const cardId = "odyssey-ambassador";

  const removeCard = () => {
    document.getElementById(cardId)?.remove();
    document.querySelectorAll(".odyssey-card").forEach((node) => node.remove());
  };

  const start = () => {
    removeCard();
    if (!document.body) return;
    const observer = new MutationObserver(removeCard);
    observer.observe(document.body, { childList: true, subtree: true });
    [250, 750, 1500, 3000].forEach((delay) => window.setTimeout(removeCard, delay));
  };

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
