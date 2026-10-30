// Motion for /pulse/. Vanilla rebuild of EasyUI style effects
// (https://easyui.site/, MIT License, by Suraj Maurya): staggered blur-fade-up
// reveal, cursor spotlight cards, badge shine, and a source ticker.
// The site is static HTML on GitHub Pages, so this uses IntersectionObserver
// and CSS instead of React and Framer Motion. Content stays visible without JS,
// and nothing moves when the visitor prefers reduced motion.
const REVEAL = [".lede > *", "#signup-panel", ".list-card", ".gets > div", ".tech-sample .samples-intro", ".tech-sheet", ".tech-sheet .issue-when", ".source-ticker", ".tech-sec h4", ".tech-item", ".tech-sheet .sample-note", "#samples .samples-intro", "#samples .sample-rail", "#samples .sample-nav"];
const SPOT = [".list-card", ".tech-sheet", "#signup-panel", ".list-pick .pick"];

export function bootMotion(doc = document) {
  const view = doc.defaultView;
  if (!view) return;
  const reduce = view.matchMedia?.("(prefers-reduced-motion: reduce)");
  if (reduce?.matches) return;
  const root = doc.documentElement;
  root.classList.add("motion-on");

  const items = [...new Set(REVEAL.flatMap((sel) => [...doc.querySelectorAll(sel)]))];
  if (view.IntersectionObserver) {
    const seen = new Map();
    items.forEach((el) => el.setAttribute("data-rv", ""));
    root.classList.add("reveal-on");
    const io = new view.IntersectionObserver((entries) => {
      const hits = entries.filter((e) => e.isIntersecting).map((e) => e.target)
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      hits.forEach((el, i) => {
        if (seen.has(el)) return;
        seen.set(el, true);
        el.style.setProperty("--rv-delay", `${Math.min(i, 8) * 85}ms`);
        el.classList.add("is-in");
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach((el) => io.observe(el));
    // Safety: never leave content hidden.
    view.setTimeout(() => items.forEach((el) => el.classList.add("is-in")), 6000);
  }

  for (const el of SPOT.flatMap((sel) => [...doc.querySelectorAll(sel)])) {
    el.classList.add("spot");
    el.addEventListener("pointermove", (event) => {
      const box = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${event.clientX - box.left}px`);
      el.style.setProperty("--my", `${event.clientY - box.top}px`);
    });
  }

  for (const input of doc.querySelectorAll(".list-pick input[type=checkbox]")) {
    input.addEventListener("change", () => {
      const pick = input.closest(".pick");
      pick?.classList.remove("just-changed");
      void pick?.offsetWidth;
      pick?.classList.add("just-changed");
    });
  }
}

if (typeof document !== "undefined") bootMotion(document);
