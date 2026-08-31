(() => {
  const sectionId = "official-channels";
  const pageDescription =
    "Nasirr G. Mayo helps founders, creatives, and business owners build brands, websites, and digital systems they can own.";
  const channels = [
    {
      name: "Instagram / Creative",
      handle: "@shopnasgfx",
      href: "https://www.instagram.com/shopnasgfx/",
    },
    {
      name: "Instagram / Education",
      handle: "@innergintel",
      href: "https://www.instagram.com/innergintel/",
    },
    {
      name: "YouTube",
      handle: "@innergintel",
      href: "https://www.youtube.com/@innergintel",
    },
    {
      name: "Substack",
      handle: "InnerG Intelligence",
      href: "https://open.substack.com/pub/innergintelligence",
    },
    {
      name: "LinkedIn",
      handle: "Nasirr Mayo",
      href: "https://www.linkedin.com/in/nasirr-mayo-40647525a",
    },
    {
      name: "X",
      handle: "@InnerGNas",
      href: "https://x.com/InnerGNas",
    },
  ];

  const buildProfileActions = () => {
    const actions = document.createElement("nav");

    actions.className = "profile-actions";
    actions.setAttribute("aria-label", "Start here");
    actions.innerHTML = `
      <a class="profile-action" href="#talk-business">SPEAK WITH ME</a>
      <a class="profile-action profile-action--channels" href="#${sectionId}">FIND MY CHANNELS</a>`;
    return actions;
  };

  const buildFooterQuote = () => {
    const quote = document.createElement("blockquote");
    quote.className = "founder-footer-quote";
    quote.innerHTML = `
      <p>"I help founders, creatives, and business owners shape ideas, build brands, launch websites, and organize digital systems they can own."</p>
      <cite>NASIRR G. MAYO</cite>`;
    return quote;
  };

  const buildChannels = () => {
    const section = document.createElement("section");
    section.id = sectionId;
    section.className = "official-channels";
    section.setAttribute("aria-labelledby", "official-channels-title");
    section.innerHTML = `
      <div class="official-channels__heading">
        <div>
          <p>OFFICIAL CHANNELS</p>
          <h2 id="official-channels-title">Find me without searching.</h2>
        </div>
        <span>These are the accounts I use for my public work.</span>
      </div>
      <div class="official-channels__grid">
        ${channels
          .map(
            ({ name, handle, href }) => `
              <a class="official-channel" href="${href}" target="_blank" rel="noopener noreferrer">
                <span><strong>${name}</strong><small>${handle}</small></span>
                <span aria-hidden="true">↗</span>
              </a>`,
          )
          .join("")}
      </div>`;
    return section;
  };

  const mount = () => {
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ]) {
      const meta = document.querySelector(selector);
      if (meta && meta.content !== pageDescription) {
        meta.content = pageDescription;
      }
    }

    document
      .querySelectorAll(
        ".profile-header > .social-menu, .link-tree-footer > .social-menu",
      )
      .forEach((menu) => menu.remove());

    const header = document.querySelector(".profile-header");
    const role = header?.querySelector(".profile-role");
    const about = document.querySelector(".about");
    if (header && role && about && role.nextElementSibling !== about) {
      role.insertAdjacentElement("afterend", about);
    }
    header?.querySelectorAll(".profile-statement").forEach((item) => item.remove());
    if (header && role && !header.querySelector(".profile-actions")) {
      (about || role).after(buildProfileActions());
    }

    const stats = document.getElementById("social-audience-stats");
    if (stats && !document.getElementById(sectionId)) {
      stats.insertAdjacentElement("afterend", buildChannels());
    }

    const booking = document.getElementById("talk-business");
    const bookingLabel = booking?.querySelector(".section-label");
    const bookingTitle = booking?.querySelector("#talk-business-title");
    const bookingIntro = booking?.querySelector(".talk-business-intro");
    if (bookingLabel && bookingLabel.textContent !== "SPEAK WITH ME") {
      bookingLabel.textContent = "SPEAK WITH ME";
    }
    if (
      bookingTitle &&
      bookingTitle.textContent !== "Get the right help for the work."
    ) {
      bookingTitle.textContent = "Get the right help for the work.";
    }
    if (
      bookingIntro &&
      bookingIntro.textContent !==
        "Book a short fit call for direction, or use the full briefing to plan a website or digital system."
    ) {
      bookingIntro.textContent =
        "Book a short fit call for direction, or use the full briefing to plan a website or digital system.";
    }

    const shell = document.querySelector(".link-tree-shell");
    const video = document.querySelector(".video-card");
    const linkList = document.querySelector(".link-list");
    const ambassador = document.getElementById("odyssey-ambassador");
    const footer = document.querySelector(".link-tree-footer");
    if (footer && !footer.querySelector(".founder-footer-quote")) {
      footer.prepend(buildFooterQuote());
    }
    const orderedSections = [
      document.getElementById("social-audience-stats"),
      document.getElementById(sectionId),
      video,
      linkList,
      booking,
      ambassador,
      footer,
    ].filter(Boolean);

    if (shell && header) {
      let anchor = header;
      orderedSections.forEach((section) => {
        if (anchor.nextElementSibling !== section) {
          anchor.insertAdjacentElement("afterend", section);
        }
        anchor = section;
      });
    }
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
