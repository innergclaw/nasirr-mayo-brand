(() => {
  const removeLegacyMemberCards = () => {
    document
      .querySelectorAll(".account-entry")
      .forEach((section) => section.remove());
    document
      .querySelectorAll(".link-list > a.account-link-card")
      .forEach((card) => card.remove());
  };

  removeLegacyMemberCards();
  const observer = new MutationObserver(removeLegacyMemberCards);
  observer.observe(document.body, { childList: true, subtree: true });
  [250, 750, 1500, 3000].forEach((delay) =>
    window.setTimeout(removeLegacyMemberCards, delay),
  );
})();
