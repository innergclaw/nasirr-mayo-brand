(() => {
  const sectionId = "social-audience-stats";
  const fallbackSubscribers = 748;
  const fallbackViews = 225000;

  const buildSection = (page, subscribers = fallbackSubscribers) => {
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
        <article class="social-stats__card social-stats__card--youtube" aria-label="YouTube has ${subscribers} subscribers and 225,000 views">
          <span class="social-stats__platform">YouTube</span>
          <div class="social-stats__metrics">
            <div class="social-stats__metric"><strong class="social-count" data-count-target="${subscribers}" data-count-source="youtube" aria-hidden="true">${subscribers}</strong><small>Subscribers</small></div>
            <div class="social-stats__metric"><strong class="social-count" data-count-target="${fallbackViews}" data-count-format="comma" data-count-source="youtube-views" aria-hidden="true">225,000</strong><small>Views</small></div>
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

  const applyCount = (section, source, count, label) => {
    const card = section.querySelector(".social-stats__card--youtube");
    const node = card?.querySelector(`[data-count-source='${source}']`);
    if (!card || !node || !Number.isFinite(count) || count <= 0) return;
    node.dataset.countTarget = String(count);
    if (label) card.setAttribute("aria-label", label);
    if (node.dataset.countStarted === "true") {
      node.textContent = formatCount(count, node);
    }
  };

  const loadYoutubeStats = async (section) => {
    let subscribers = fallbackSubscribers;
    let views = fallbackViews;
    try {
      const response = await fetch("/youtube-stats.json", { cache: "no-cache" });
      if (response.ok) {
        const stats = await response.json();
        const nextSubscribers = Number(stats.subscriberCount);
        const nextViews = Number(stats.viewCount);
        if (Number.isFinite(nextSubscribers) && nextSubscribers > 0) subscribers = nextSubscribers;
        if (Number.isFinite(nextViews) && nextViews > 0) views = nextViews;
      }
    } catch {
      /* Keep the fallback counts already rendered in the card. */
    }
    const label = `YouTube has ${new Intl.NumberFormat("en-US").format(subscribers)} subscribers and ${new Intl.NumberFormat("en-US").format(views)} views`;
    applyCount(section, "youtube", subscribers, label);
    applyCount(section, "youtube-views", views, label);
  };

  const mount = () => {
    const mentorshipTarget = document.querySelector(".highlight-band");
    const homeTarget = document.querySelector(".profile-header");
    const target = mentorshipTarget || homeTarget;
    const existing = document.getElementById(sectionId);
    if (existing) {
      initCounters(existing);
      if (existing.dataset.youtubeStatsLoaded !== "true") {
        existing.dataset.youtubeStatsLoaded = "true";
        loadYoutubeStats(existing);
      }
      return;
    }
    if (!target) return;

    const section = buildSection(mentorshipTarget ? "mentorship" : "home");
    target.insertAdjacentElement(
      "afterend",
      section,
    );
    initCounters(section);
    section.dataset.youtubeStatsLoaded = "true";
    loadYoutubeStats(section);
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
