(() => {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const groups = [
    [".social-stats__header", ".social-stats__card"],
    [".official-channels__heading", ".official-channel"],
    [".mentorship-main-card", ".company-services > .hire-links"],
    [".company-services > .link-card:not(.mentorship-main-card)"],
    [
      ".talk-business > .section-label",
      ".talk-business > h2",
      ".talk-business-intro",
      ".talk-business-action",
    ],
    [".video-card"],
    [".odyssey-card"],
    [".home-reference-room"],
    [".link-tree-footer"],
  ];

  const observed = new WeakSet();
  let observer;

  const finish = (element) => {
    element.dataset.homeMotionShown = "true";
    element.classList.remove(
      "home-motion-item",
      "home-motion-visible",
      "home-motion-left",
      "home-motion-right",
      "home-motion-up",
    );
    element.style.removeProperty("--home-motion-delay");
  };

  const reveal = (element) => {
    if (element.dataset.homeMotionShown === "true") return;
    element.classList.add("home-motion-visible");
  };

  const register = (element, index) => {
    if (observed.has(element) || element.dataset.homeMotionShown === "true") {
      return;
    }

    observed.add(element);
    element.classList.add(
      "home-motion-item",
      index % 2 === 0 ? "home-motion-left" : "home-motion-right",
    );
    element.style.setProperty(
      "--home-motion-delay",
      `${Math.min(index, 4) * 115}ms`,
    );

    if (element.matches(".video-card, .odyssey-card, .home-reference-room")) {
      element.classList.remove("home-motion-left", "home-motion-right");
      element.classList.add("home-motion-up");
    }

    if (reduceMotion || !observer) {
      finish(element);
      return;
    }

    element.addEventListener("animationend", () => finish(element), {
      once: true,
    });
    observer.observe(element);
  };

  const scan = () => {
    groups.forEach((selectors) => {
      const elements = document.querySelectorAll(selectors.join(","));
      elements.forEach((element, index) => register(element, index));
    });
  };

  const start = () => {
    document.documentElement.classList.add("home-motion-ready");

    if (!reduceMotion && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            reveal(entry.target);
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
      );
    }

    scan();
    const mutationObserver = new MutationObserver(scan);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    [250, 750, 1500, 3000].forEach((delay) =>
      window.setTimeout(scan, delay),
    );
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
