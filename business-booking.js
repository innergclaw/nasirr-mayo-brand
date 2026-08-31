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
    const section = document.getElementById(sectionId) || buildSection();
    const video = document.querySelector(".video-card");
    if (!video?.parentElement) return;
    if (video.previousElementSibling !== section) {
      video.parentElement.insertBefore(section, video);
    }
  };

  const start = () => {
    mountSection();
    const observer = new MutationObserver(mountSection);
    observer.observe(document.body, { childList: true, subtree: true });
  };

  const startAfterPageReady = () => window.setTimeout(start, 150);
  if (document.readyState === "complete") startAfterPageReady();
  else window.addEventListener("load", startAfterPageReady, { once: true });
})();
