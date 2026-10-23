(() => {
  const mountCard = () => {
    document
      .querySelectorAll(".home-reference-room, .mentorship-entry, .account-entry")
      .forEach((section) => section.remove());

    const list = document.querySelector(".link-list");
    if (!list) return;
    list.classList.add("company-services");

    // The "how can i help you" heading and its service cards were retired.
    list
      .querySelectorAll(".hire-links, .link-card")
      .forEach((node) => node.remove());

    const intake = document.getElementById("project-intake");
    if (intake && list.firstElementChild !== intake) list.prepend(intake);
    let anchor = intake || list;

    const booking = document.getElementById("talk-business");
    if (intake && booking && anchor.nextElementSibling !== booking) {
      anchor.insertAdjacentElement("afterend", booking);
    }
  };

  const start = () => {
    mountCard();
    const observer = new MutationObserver(mountCard);
    observer.observe(document.body, { childList: true, subtree: true });
    [250, 750, 1500, 3000].forEach((delay) =>
      window.setTimeout(mountCard, delay),
    );
  };

  const startAfterPageReady = () => window.setTimeout(start, 150);
  if (document.readyState === "complete") startAfterPageReady();
  else window.addEventListener("load", startAfterPageReady, { once: true });
})();
