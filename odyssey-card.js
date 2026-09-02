(() => {
  const cardId = "odyssey-ambassador";

  const buildCard = () => {
    const section = document.createElement("section");
    section.className = "odyssey-card";
    section.id = cardId;
    section.setAttribute("aria-labelledby", "odyssey-title");
    section.innerHTML = `
      <div class="odyssey-card__header">
        <div>
          <p class="odyssey-card__eyebrow">Odyssey / Functional Energy</p>
          <h2 id="odyssey-title">Energy for the work.</h2>
        </div>
        <span class="odyssey-card__badge">Ambassador</span>
      </div>
      <p class="odyssey-card__disclosure">Ambassador links. I may earn a commission from qualifying purchases.</p>
      <div class="odyssey-card__actions">
        <a class="odyssey-card__link" href="https://OdysseyFunctionalEnergy.com/nasirrmayo" target="_blank" rel="sponsored noreferrer">
          <span>Shop my Odyssey page</span><span aria-hidden="true">↗</span>
        </a>
        <a class="odyssey-card__link" href="https://OdysseyFunctionalEnergy.com/products/222-variety-pack?bg_ref=XOoB0hKjMs" target="_blank" rel="sponsored noreferrer">
          <span>222MG variety pack</span><span aria-hidden="true">↗</span>
        </a>
        <a class="odyssey-card__link" href="https://OdysseyFunctionalEnergy.com/products/variety-pack?bg_ref=XOoB0hKjMs" target="_blank" rel="sponsored noreferrer">
          <span>Functional energy pack</span><span aria-hidden="true">↗</span>
        </a>
      </div>
      <div class="odyssey-card__footer">
        <div>
          <span class="odyssey-card__code-label">Use code</span>
          <strong class="odyssey-card__code">ODYSSEYNASIRR</strong>
        </div>
        <p class="odyssey-card__offer">Save 20% on your order. Product availability and offer terms are set by Odyssey.</p>
      </div>
    `;
    return section;
  };

  const mountCard = () => {
    const existing = document.getElementById(cardId);
    const card = existing || buildCard();
    const linkList = document.querySelector(".link-list");
    const video = document.querySelector(".video-card");
    const booking = document.getElementById("talk-business");
    const referenceRoom = document.querySelector(".home-reference-room");
    const footer = document.querySelector(".link-tree-footer");
    const anchor = linkList || booking || video || referenceRoom || footer;
    if (!anchor?.parentElement) return;
    if (anchor.nextElementSibling !== card) {
      anchor.insertAdjacentElement("afterend", card);
    }
  };

  const start = () => {
    mountCard();
    const observer = new MutationObserver(mountCard);
    observer.observe(document.body, { childList: true, subtree: true });
  };

  const startAfterPageReady = () => window.setTimeout(start, 150);
  if (document.readyState === "complete") startAfterPageReady();
  else window.addEventListener("load", startAfterPageReady, { once: true });
})();
