(() => {
  const sectionId = "talk-business";

  const buildSection = () => {
    const section = document.createElement("section");
    section.className = sectionId;
    section.id = sectionId;
    section.setAttribute("aria-labelledby", "talk-business-title");
    section.innerHTML = `
      <p class="section-label">SPEAK WITH ME</p>
      <h2 id="talk-business-title">Get the right help for the work.</h2>
      <p class="talk-business-intro">Book a short fit call for direction, or use the full briefing to plan a website or digital system.</p>
      <div class="talk-business-actions">
        <a class="talk-business-action" href="https://cal.com/ownyourwebsmm/15min" target="_blank" rel="noopener noreferrer">
          <span class="talk-business-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7.2 3.5 9.6 7l-1.8 2.1a15.7 15.7 0 0 0 7.1 7.1l2.1-1.8 3.5 2.4-.9 3.1c-.2.7-.9 1.2-1.7 1.1A17.1 17.1 0 0 1 3 6.1c-.1-.8.4-1.5 1.1-1.7l3.1-.9Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="talk-business-time">15 MIN</span>
          <span class="talk-business-copy"><strong>Project fit call</strong><small>Decide the best next step for your idea.</small></span>
        </a>
        <a class="talk-business-action" href="https://cal.com/ownyourwebsmm/30min" target="_blank" rel="noopener noreferrer">
          <span class="talk-business-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7.2 3.5 9.6 7l-1.8 2.1a15.7 15.7 0 0 0 7.1 7.1l2.1-1.8 3.5 2.4-.9 3.1c-.2.7-.9 1.2-1.7 1.1A17.1 17.1 0 0 1 3 6.1c-.1-.8.4-1.5 1.1-1.7l3.1-.9Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="talk-business-time">30 MIN</span>
          <span class="talk-business-copy"><strong>Website &amp; system briefing</strong><small>Discuss goals, scope, timeline, and setup.</small></span>
        </a>
      </div>
    `;
    return section;
  };

  const mountSection = () => {
    const section = document.getElementById(sectionId) || buildSection();
    const linkList = document.querySelector(".link-list");
    if (!linkList?.parentElement) return;
    const featuredCard = linkList.querySelector(".mentorship-main-card");
    if (featuredCard && featuredCard.previousElementSibling !== section) {
      featuredCard.insertAdjacentElement("beforebegin", section);
    } else if (!featuredCard && section.parentElement !== linkList) {
      linkList.append(section);
    }
  };

  const start = () => {
    mountSection();
    [250, 750, 1500].forEach((delay) =>
      window.setTimeout(mountSection, delay),
    );
  };

  const startAfterPageReady = () => window.setTimeout(start, 150);
  if (document.readyState === "complete") startAfterPageReady();
  else window.addEventListener("load", startAfterPageReady, { once: true });
})();
