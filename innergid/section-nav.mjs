// Section navigation stays independent of authentication and checkout.
export function revealSection(root, hash) {
  const allowed = ['#preview', '#access', '#benefits', '#full-video', '#who-its-for', '#channels', '#member-panel'];
  if (!allowed.includes(hash)) return null;
  const target = root.querySelector(hash);
  if (target?.tagName === 'DETAILS') target.open = true;
  root.querySelectorAll('.section-nav a[href^="#"]').forEach(link => {
    if (link.getAttribute('href') === hash) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  return target;
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('.section-nav a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
      const target = revealSection(document, link.getAttribute('href'));
      // Keep native anchor navigation; move keyboard focus into opened details.
      if (target?.tagName === 'DETAILS') target.querySelector('summary')?.focus({preventScroll:true});
    });
  });
  window.addEventListener('hashchange', () => revealSection(document, location.hash));
  revealSection(document, location.hash);
}
