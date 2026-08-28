(() => {
  const sectionId = "mentorship-entry";

  const buildSection = () => {
    const section = document.createElement("section");
    section.className = sectionId;
    section.id = sectionId;
    section.setAttribute("aria-labelledby", "mentorship-entry-title");
    section.innerHTML = `
      <p class="section-label">MENTORSHIP / ACCOUNTABILITY</p>
      <h2 id="mentorship-entry-title">Build with someone in your corner.</h2>
      <p class="mentorship-entry-copy">Practical conversation, guidance, and follow-through for new entrepreneurs.</p>
      <a class="mentorship-entry-action" href="mentorship/">EXPLORE MENTORSHIP <span aria-hidden="true">↗</span></a>
    `;
    return section;
  };

  const mountSection = () => {
    if (document.getElementById(sectionId)) return;
    const reference = document.querySelector(".home-reference-room");
    const business = document.querySelector(".talk-business");
    const footer = document.querySelector(".link-tree-footer");
    const anchor = business || footer;
    if (!reference?.parentElement) return;
    reference.parentElement.insertBefore(buildSection(), anchor || null);
  };

  mountSection();
  const observer = new MutationObserver(mountSection);
  observer.observe(document.body, { childList: true, subtree: true });
})();
