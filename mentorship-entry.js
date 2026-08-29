(() => {
  const buildCard = () => {
    const card = document.createElement("article");
    card.className =
      "link-card mentorship-link-card mentorship-main-card is-visible";
    card.setAttribute("aria-labelledby", "mentorship-main-title");
    card.innerHTML = `
      <div class="mentorship-main-meta">
        <span>00 / FEATURED</span><span>GUIDANCE WITH FOLLOW-THROUGH</span>
      </div>
      <span class="link-copy">
        <strong id="mentorship-main-title">MENTORSHIP / ACCOUNTABILITY</strong>
        <small>Practical guidance, steady accountability, and direct support for your next move.</small>
      </span>
      <div class="mentorship-main-actions">
        <a class="mentorship-main-action mentorship-main-action-primary" href="mentorship/">
          <span>EXPLORE MENTORSHIP</span><span aria-hidden="true">↗</span>
        </a>
        <a class="mentorship-main-action mentorship-main-action-secondary" href="account/">
          <span>MEMBER ACCESS</span><span aria-hidden="true">↗</span>
        </a>
      </div>`;
    return card;
  };

  const getTitle = (card) =>
    card.querySelector(".link-copy strong")?.textContent.trim().toUpperCase();

  const buildHeading = () => {
    const heading = document.createElement("section");
    heading.className = "hire-links";
    heading.setAttribute("aria-labelledby", "hire-links-title");
    heading.innerHTML =
      '<p class="section-label" id="hire-links-title">HIRE MY COMPANY TO HELP YOU</p>';
    return heading;
  };

  const mountCard = () => {
    document
      .querySelectorAll(".home-reference-room, .mentorship-entry, .account-entry")
      .forEach((section) => section.remove());

    const list = document.querySelector(".link-list");
    if (!list) return;

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

    if (!list.querySelector(".mentorship-main-card")) {
      list.prepend(buildCard());
    }

    const mainCard = list.querySelector(".mentorship-main-card");
    const headings = [...document.querySelectorAll(".hire-links")];
    const heading = headings.shift() || buildHeading();
    headings.forEach((duplicate) => duplicate.remove());
    if (mainCard && mainCard.nextElementSibling !== heading) {
      mainCard.insertAdjacentElement("afterend", heading);
    }

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
  };

  mountCard();
  const observer = new MutationObserver(mountCard);
  observer.observe(document.body, { childList: true, subtree: true });
  [250, 750, 1500, 3000].forEach((delay) =>
    window.setTimeout(mountCard, delay),
  );
})();
