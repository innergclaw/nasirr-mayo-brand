export function updateSectionNavigation(root, hash) {
  if(hash==='#sunday-brief')hash='#what-to-watch';
  root.querySelectorAll('.section-nav a').forEach(link => {
    if (link.getAttribute('href') === hash) link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  });
}
if (typeof document !== 'undefined') {
  const update = () => updateSectionNavigation(document,location.hash || '#overview');
  window.addEventListener('hashchange',update);
  update();
}
