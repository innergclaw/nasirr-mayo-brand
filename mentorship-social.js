(() => {
  const addMentorshipLink = (items) => {
    if (!items || items.querySelector('.mentorship-social-link')) return;
    const link = document.createElement('a');
    link.className = 'social-menu__item mentorship-social-link';
    link.href = 'mentorship/';
    link.setAttribute('aria-label', 'Mentorship and accountability');
    link.title = 'Mentorship and accountability';
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Zm0-6.4a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6ZM4.2 21v-1.1a7.8 7.8 0 0 1 15.6 0V21H18v-1.1a6 6 0 0 0-12 0V21H4.2Z"></path></svg>';
    items.appendChild(link);
    [...items.children].forEach((item, index) => item.style.setProperty('--social-index', String(index)));
  };

  const mount = () => document.querySelectorAll('.social-menu__items').forEach(addMentorshipLink);
  const start = () => {
    mount();
    new MutationObserver(mount).observe(document.body, { childList: true, subtree: true });
  };

  const startAfterPageReady = () => window.setTimeout(start, 150);
  if (document.readyState === 'complete') startAfterPageReady();
  else window.addEventListener('load', startAfterPageReady, { once: true });
})();
