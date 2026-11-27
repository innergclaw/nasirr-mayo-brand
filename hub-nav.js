/*! hub-nav.js ~ INNERG INTEL shared "Back to the hub" link + scroll-to-top arrow.
 * Vanilla JS + CSS, no dependencies. Two small files per site, kept side by side:
 *   hub-nav.js  hub-nav.css
 * Add once per page, before </body>:
 *   <script src="hub-nav.js" defer></script>
 * The script loads hub-nav.css from the same folder (works under style-src 'self').
 *
 * Optional data-* attributes on that script tag:
 *   data-home            the page IS the hub: arrow only, no hub link
 *   data-no-top          the page already has its own scroll-to-top: hub link only
 *   data-link-pos="top"  put the hub link top-left instead of bottom-left
 *   data-bg data-ink data-accent data-accent-ink data-icon   palette (default Style A)
 *   data-font            label font-family
 *   data-left data-bottom data-link-bottom data-right data-top   px offsets
 *   data-m-bottom data-m-link-bottom   px bottom offsets at <= 640px
 *   data-z               z-index (default 2000)
 */
(function () {
  'use strict';
  if (window.__hubNav) return;
  window.__hubNav = true;

  var HUB = 'https://nasirr.innergintel.study/';
  var script = document.currentScript;
  var d = (script && script.dataset) || {};
  var isHub = 'home' in d ||
    (location.hostname === 'nasirr.innergintel.study' && (location.pathname === '/' || location.pathname === '/index.html'));

  var VARS = { bg: '--hn-bg', ink: '--hn-ink', accent: '--hn-accent', accentInk: '--hn-accent-ink', icon: '--hn-icon', font: '--hn-font' };
  var PX = { left: '--hn-left', bottom: '--hn-bottom', linkBottom: '--hn-link-bottom', right: '--hn-right', top: '--hn-top', mBottom: '--hn-m-bottom', mLinkBottom: '--hn-m-link-bottom', z: '--hn-z' };
  var root = document.documentElement;
  Object.keys(VARS).forEach(function (k) { if (d[k]) root.style.setProperty(VARS[k], d[k]); });
  Object.keys(PX).forEach(function (k) {
    if (/^\d+$/.test(d[k] || '')) root.style.setProperty(PX[k], k === 'z' ? d[k] : d[k] + 'px');
  });

  var NS = 'http://www.w3.org/2000/svg';
  function icon(path) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', path);
    s.appendChild(p);
    return s;
  }

  function build() {
    var link = null;
    if (!isHub) {
      link = document.createElement('a');
      link.className = 'hub-nav-link';
      if (d.linkPos === 'top') link.setAttribute('data-pos', 'top');
      link.href = HUB;
      link.appendChild(icon('M20 12H5M11 5l-7 7 7 7'));
      var label = document.createElement('span');
      label.textContent = 'Back to the hub';
      link.appendChild(label);
      document.body.insertBefore(link, document.body.firstChild);
    }
    if ('noTop' in d) return;

    var top = document.createElement('button');
    top.type = 'button';
    top.className = 'hub-nav-top';
    top.setAttribute('aria-label', 'Scroll to top');
    top.title = 'Scroll to top';
    top.appendChild(icon('M12 20V5M5 12l7-7 7 7'));
    document.body.appendChild(top);

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, left: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
      // The arrow hides at the top, so hand keyboard focus to the start of the page.
      var target = link || document.body;
      if (!link) {
        if (!document.body.hasAttribute('tabindex')) document.body.setAttribute('tabindex', '-1');
        document.body.classList.add('hub-nav-focus');
      }
      target.focus({ preventScroll: true });
    });

    function setVisible(on) { top.toggleAttribute('data-visible', on); }
    if ('IntersectionObserver' in window) {
      var sentinel = document.createElement('div');
      sentinel.className = 'hub-nav-sentinel';
      sentinel.setAttribute('aria-hidden', 'true');
      root.appendChild(sentinel);
      new IntersectionObserver(function (entries) {
        setVisible(!entries[entries.length - 1].isIntersecting);
      }).observe(sentinel);
    } else {
      var onScroll = function () { setVisible((window.pageYOffset || 0) > 320); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  function start() {
    if (!script || !script.src) return;
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = script.src.replace(/hub-nav\.js(\?.*)?$/, 'hub-nav.css$1');
    css.addEventListener('load', build, { once: true });
    document.head.appendChild(css);
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
