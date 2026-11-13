// INNERG PULSE splash (modeled on the 10For10 site splash). Seal slides up, lands, holds, fades out.
// JS only: no JS means no splash. Once per session. Tap, click or any key skips. Reduced motion skips it.
(function () {
  try {
    if (sessionStorage.getItem("pulse_splash_seen")) return;
    sessionStorage.setItem("pulse_splash_seen", "1");
  } catch (e) { /* storage blocked: still show once for this load */ }
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var d = document, s = d.createElement("div");
  s.className = "pulse-splash"; s.setAttribute("aria-hidden", "true");
  s.innerHTML = '<div class="pulse-splash-grain"></div><img class="pulse-splash-seal" src="assets/seal-640.jpg" width="640" height="640" alt="" decoding="async" />';
  d.body.insertBefore(s, d.body.firstChild);
  d.documentElement.classList.add("pulse-splash-on");
  var done = false, t;
  function hide() {
    if (done) return; done = true; clearTimeout(t);
    s.classList.add("is-out");
    d.documentElement.classList.remove("pulse-splash-on");
    setTimeout(function () { s.remove(); }, 450);
  }
  t = setTimeout(hide, 1900);           // 1.0s slide + 0.9s hold, then 0.45s fade = about 2.35s
  s.addEventListener("pointerdown", hide);
  d.addEventListener("keydown", hide, { once: true });
  setTimeout(hide, 4000);               // hard cap
})();
