(() => {
  const sectionId = "social-audience-stats";

  const buildSection = (page) => {
    const section = document.createElement("section");
    section.id = sectionId;
    section.className = `social-stats social-stats--${page}`;
    section.setAttribute("aria-labelledby", "social-stats-title");
    section.innerHTML = `
      <div class="social-stats__header">
        <p id="social-stats-title">Social reach</p>
        <span>Current audience</span>
      </div>
      <div class="social-stats__grid">
        <article class="social-stats__card social-stats__card--youtube" aria-label="YouTube has 719 subscribers and more than 200,000 views">
          <span class="social-stats__platform">YouTube</span>
          <div class="social-stats__metrics">
            <div class="social-stats__metric"><strong>719</strong><small>Subscribers</small></div>
            <div class="social-stats__metric"><strong>200,000+</strong><small>Views</small></div>
          </div>
        </article>
        <article class="social-stats__card social-stats__card--substack" aria-label="Substack has 65 subscribers">
          <span class="social-stats__platform">Substack</span>
          <div class="social-stats__metrics">
            <div class="social-stats__metric"><strong>65</strong><small>Subscribers</small></div>
          </div>
        </article>
      </div>`;
    return section;
  };

  const mount = () => {
    const mentorshipTarget = document.querySelector(".highlight-band");
    const homeTarget = document.querySelector(".profile-header");
    const target = mentorshipTarget || homeTarget;
    if (!target || document.getElementById(sectionId)) return;

    target.insertAdjacentElement(
      "afterend",
      buildSection(mentorshipTarget ? "mentorship" : "home"),
    );
  };

  mount();
  const observer = new MutationObserver(mount);
  observer.observe(document.body, { childList: true, subtree: true });
  [250, 750, 1500, 3000].forEach((delay) => window.setTimeout(mount, delay));
})();
