(() => {
  const sectionId = "talk-business";

  const buildSection = () => {
    const section = document.createElement("section");
    section.className = sectionId;
    section.id = sectionId;
    section.setAttribute("aria-labelledby", "talk-business-title");
    section.innerHTML = `
      <p class="section-label">LET’S TALK BUSINESS</p>
      <h2 id="talk-business-title">Choose the right next step.</h2>
      <p class="talk-business-intro">Have a project in mind? Start with a short fit check, or bring the full brief when you are ready to map the work.</p>
      <div class="talk-business-actions">
        <a class="talk-business-action" href="https://cal.com/ownyourwebsmm/15min" target="_blank" rel="noopener noreferrer">
          <span class="talk-business-time">15 MIN</span>
          <strong>Project fit call</strong>
          <small>Decide the best next step for your idea.</small>
        </a>
        <a class="talk-business-action" href="https://cal.com/ownyourwebsmm/30min" target="_blank" rel="noopener noreferrer">
          <span class="talk-business-time">30 MIN</span>
          <strong>Website &amp; system briefing</strong>
          <small>Discuss goals, scope, timeline, and setup.</small>
        </a>
      </div>
    `;
    return section;
  };

  const mountSection = () => {
    if (document.getElementById(sectionId)) return;
    const reference = document.querySelector(".home-reference-room");
    const ambassador = document.querySelector("#odyssey-ambassador");
    const footer = document.querySelector(".link-tree-footer");
    const anchor = ambassador || footer;
    if (!reference?.parentElement) return;
    reference.parentElement.insertBefore(buildSection(), anchor || null);
  };

  mountSection();
  const observer = new MutationObserver(mountSection);
  observer.observe(document.body, { childList: true, subtree: true });
})();
