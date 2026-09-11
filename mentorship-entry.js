(() => {
  const getTitle = (card) =>
    card.querySelector(".link-copy strong")?.textContent.trim().toUpperCase();

  const buildHeading = () => {
    const heading = document.createElement("section");
    heading.className = "hire-links";
    heading.id = "how-can-i-help";
    heading.setAttribute("aria-labelledby", "hire-links-title");
    heading.innerHTML =
      '<p class="section-label" id="hire-links-title">HOW CAN I HELP YOU?</p>';
    return heading;
  };

  const mountCard = () => {
    document
      .querySelectorAll(".home-reference-room, .mentorship-entry, .account-entry")
      .forEach((section) => section.remove());

    const list = document.querySelector(".link-list");
    if (!list) return;
    list.classList.add("company-services");

    list.querySelectorAll(".link-card").forEach((card) => {
      const title = getTitle(card);
      if (title === "HIRE / BOOK ME") card.remove();
      if (title === "INNERG INTEL") {
        card.querySelector(".link-copy strong").textContent =
          "INNERG INTEL EDUCATION";
      }
    });

    list
      .querySelectorAll("a.mentorship-link-card, a.account-link-card")
      .forEach((card) => card.remove());

    const headings = [...document.querySelectorAll(".hire-links")];
    const heading = headings.shift() || buildHeading();
    headings.forEach((duplicate) => duplicate.remove());
    const numbers = new Map([
      ["OWNYOURWEB SYSTEMS", "01"],
      ["INNERG INTEL EDUCATION", "02"],
      ["CREATIVE DESIGN SERVICES", "03"],
      ["AGENT ACADEMY / COMING SOON", "04"],
    ]);

    list.querySelectorAll(".link-card").forEach((card) => {
      const number = numbers.get(getTitle(card));
      const numberNode = card.querySelector(":scope > .link-number");
      if (number && numberNode && numberNode.textContent !== number) {
        numberNode.textContent = number;
      }
    });

    const serviceTitles = [...numbers.keys()];
    const serviceCards = serviceTitles
      .map((title) =>
        [...list.querySelectorAll(".link-card")].find(
          (card) => getTitle(card) === title,
        ),
      )
      .filter(Boolean);

    if (list.firstElementChild !== heading) {
      list.prepend(heading);
    }

    let anchor = heading;
    serviceCards.forEach((card) => {
      if (anchor.nextElementSibling !== card) {
        anchor.insertAdjacentElement("afterend", card);
      }
      anchor = card;
    });

    const intake = document.getElementById("project-intake");
    if (intake && anchor.nextElementSibling !== intake) {
      anchor.insertAdjacentElement("afterend", intake);
    }
    if (intake) anchor = intake;

    const booking = document.getElementById("talk-business");
    if (booking && anchor.nextElementSibling !== booking) {
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
