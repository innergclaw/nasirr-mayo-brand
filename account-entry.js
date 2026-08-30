(() => {
  const removeLegacyMemberCards = () => {
    document
      .querySelectorAll(".account-entry")
      .forEach((section) => section.remove());
    document
      .querySelectorAll(".link-list > a.account-link-card")
      .forEach((card) => card.remove());
  };

  const start = () => {
    removeLegacyMemberCards();
    const observer = new MutationObserver(removeLegacyMemberCards);
    observer.observe(document.body, { childList: true, subtree: true });
    [250, 750, 1500, 3000].forEach((delay) =>
      window.setTimeout(removeLegacyMemberCards, delay),
    );
  };

  const startAfterPageReady = () => window.setTimeout(start, 150);
  if (document.readyState === "complete") startAfterPageReady();
  else window.addEventListener("load", startAfterPageReady, { once: true });
})();
