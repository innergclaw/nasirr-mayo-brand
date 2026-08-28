(() => {
  const sectionId = "mentorship-entry";

  const buildLink = () => {
    const link = document.createElement("a");
    link.className = "link-card mentorship-link-card";
    link.href = "mentorship/";
    link.innerHTML = '<span class="link-number">00</span><span class="link-copy"><strong>MENTORSHIP / ACCOUNTABILITY</strong><small>Practical conversation, guidance, and follow-through.</small></span>';
    return link;
  };

  const mountSection = () => {
    document.querySelectorAll('.home-reference-room, .mentorship-entry').forEach((section) => section.remove());
    const list = document.querySelector(".link-list");
    if (list && !list.querySelector('a[href="mentorship/"]')) list.prepend(buildLink());
  };

  mountSection();
  const observer = new MutationObserver(mountSection);
  observer.observe(document.body, { childList: true, subtree: true });
  [250, 750, 1500, 3000].forEach((delay) => window.setTimeout(mountSection, delay));
})();
