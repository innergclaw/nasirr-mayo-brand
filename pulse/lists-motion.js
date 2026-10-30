// Section reveal for /pulse/. A small vanilla rebuild of the blur-fade-in reveal
// motion used across EasyUI (https://easyui.site/, MIT, by Suraj Maurya).
// The site is static HTML on GitHub Pages, so this skips React and Framer Motion
// and uses IntersectionObserver plus CSS transitions instead.
export function bootReveal(doc = document) {
  const view = doc.defaultView;
  const items = [...doc.querySelectorAll("[data-reveal]")];
  if (!view || items.length === 0) return;
  const reduce = view.matchMedia?.("(prefers-reduced-motion: reduce)");
  if (reduce?.matches || !view.IntersectionObserver) return;
  doc.documentElement.classList.add("reveal-on");
  items.forEach((item) => {
    const group = item.parentElement?.closest("[data-reveal-group]");
    const index = group ? [...group.querySelectorAll("[data-reveal]")].indexOf(item) : 0;
    item.style.setProperty("--reveal-delay", `${index * 90}ms`);
  });
  const observer = new view.IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  items.forEach((item) => observer.observe(item));
  reduce?.addEventListener?.("change", () => items.forEach((item) => item.classList.add("is-in")));
}

if (typeof document !== "undefined") bootReveal(document);
