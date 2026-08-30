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
            <div class="social-stats__metric"><strong class="social-count" data-count-target="719" aria-hidden="true">719</strong><small>Subscribers</small></div>
            <div class="social-stats__metric"><strong class="social-count" data-count-target="200000" data-count-format="comma" data-count-suffix="+" aria-hidden="true">200,000+</strong><small>Views</small></div>
          </div>
        </article>
        <article class="social-stats__card social-stats__card--instagram" aria-label="More than 10,000 followers across Instagram">
          <span class="social-stats__platform">Instagram</span>
          <div class="social-stats__metrics">
            <div class="social-stats__metric"><strong class="social-count" data-count-target="10" data-count-suffix="K+" aria-hidden="true">10K+</strong><small>Followers</small></div>
          </div>
        </article>
        <article class="social-stats__card social-stats__card--impact" aria-label="More than 500 founders and business owners helped">
          <span class="social-stats__platform">Founders &amp; Business Owners Helped</span>
          <div class="social-stats__metrics">
            <div class="social-stats__metric"><strong class="social-count" data-count-target="500" data-count-suffix="+" aria-hidden="true">500+</strong><small>Since 2015</small></div>
          </div>
        </article>
      </div>`;
    return section;
  };

  const formatCount = (value, node) => {
    const formatted =
      node.dataset.countFormat === "comma"
        ? new Intl.NumberFormat("en-US").format(value)
        : String(value);
    return `${formatted}${node.dataset.countSuffix || ""}`;
  };

  const animateCount = (node) => {
    if (node.dataset.countStarted === "true") return;
    node.dataset.countStarted = "true";

    const target = Number(node.dataset.countTarget);
    const duration = target >= 100000 ? 1600 : 1200;
    const startedAt = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = formatCount(Math.round(target * eased), node);
      if (progress < 1) window.requestAnimationFrame(step);
    };

    window.requestAnimationFrame(step);
  };

  const initCounters = (section) => {
    if (section.dataset.countersReady === "true") return;
    section.dataset.countersReady = "true";

    const counters = [...section.querySelectorAll(".social-count")];
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion || !("IntersectionObserver" in window)) return;

    counters.forEach((node) => {
      node.textContent = formatCount(0, node);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target
            .querySelectorAll(".social-count")
            .forEach(animateCount);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.35, rootMargin: "0px 0px -8% 0px" },
    );

    section
      .querySelectorAll(".social-stats__card")
      .forEach((card) => observer.observe(card));
  };

  const mount = () => {
    const mentorshipTarget = document.querySelector(".highlight-band");
    const homeTarget = document.querySelector(".profile-header");
    const target = mentorshipTarget || homeTarget;
    const existing = document.getElementById(sectionId);
    if (existing) {
      initCounters(existing);
      return;
    }
    if (!target) return;

    const section = buildSection(mentorshipTarget ? "mentorship" : "home");
    target.insertAdjacentElement(
      "afterend",
      section,
    );
    initCounters(section);
  };

  const start = () => {
    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    [250, 750, 1500, 3000].forEach((delay) =>
      window.setTimeout(mount, delay),
    );
  };

  const startAfterPageReady = () => window.setTimeout(start, 150);
  if (document.readyState === "complete") startAfterPageReady();
  else window.addEventListener("load", startAfterPageReady, { once: true });
})();
