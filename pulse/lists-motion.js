// Motion for /pulse/. Vanilla rebuild of EasyUI style effects
// (https://easyui.site/, MIT License, by Suraj Maurya): staggered blur-fade-up
// reveal, word by word headings, cursor spotlight cards, badge shine, and a source ticker.
// The site is static HTML on GitHub Pages, so this uses IntersectionObserver
// and CSS instead of React and Framer Motion. Content stays visible without JS,
// and nothing moves when the visitor prefers reduced motion.
const REVEAL = [".hero > *:not(h1)", "#signup-panel", ".block-intro", ".tech-sheet", ".tech-sheet .issue-when", ".source-ticker", ".tech-sec h4", ".sec-sub", ".tech-item", ".sample-note", ".list-card", ".gets > div", ".final-cta > *"];
const SPOT = [".list-card", ".tech-sheet", "#signup-panel", ".list-pick .pick", ".final-cta"];

// Second signup point: scroll to the one real form and focus the email field.
export function bootJump(doc = document) {
  for (const link of doc.querySelectorAll("[data-jump-signup]")) {
    link.addEventListener("click", (event) => {
      const panel = doc.getElementById("signup-panel");
      if (!panel) return;
      event.preventDefault();
      const still = doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      panel.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
      const field = doc.getElementById("email");
      field?.focus({ preventScroll: true });
    });
  }
}

// Word by word blur-fade-up for headings marked data-words, then the lime sheen.
export function splitWords(el, doc = document) {
  let index = 0;
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const frag = doc.createDocumentFragment();
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.append(doc.createTextNode(part)); continue; }
          const word = doc.createElement("span");
          word.className = "w";
          word.textContent = part;
          word.style.setProperty("--wi", String(index++));
          frag.append(word);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === 1) walk(child);
    }
  };
  walk(el);
  return index;
}

export function bootMotion(doc = document) {
  const view = doc.defaultView;
  if (!view) return;
  bootJump(doc);
  const reduce = view.matchMedia?.("(prefers-reduced-motion: reduce)");
  if (reduce?.matches) return;
  const root = doc.documentElement;
  root.classList.add("motion-on");

  for (const heading of doc.querySelectorAll("[data-words]")) {
    const count = splitWords(heading, doc);
    heading.classList.add("words");
    const play = () => {
      heading.classList.add("words-in");
      view.setTimeout(() => heading.classList.add("sheen"), 700 + count * 90);
    };
    if (heading.closest(".hero") || !view.IntersectionObserver) { view.requestAnimationFrame(() => view.requestAnimationFrame(play)); continue; }
    const wio = new view.IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { play(); wio.disconnect(); }
    }, { threshold: 0.4 });
    wio.observe(heading);
  }

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
