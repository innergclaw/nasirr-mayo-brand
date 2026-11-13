export function bootSamples(doc = document) {
  const root = doc.querySelector("[data-samples]");
  const view = doc.defaultView;
  if (!root || !view?.matchMedia) return;
  const rail = root.querySelector("[data-sample-rail]");
  const cards = [...root.querySelectorAll("[data-sample-card]")];
  const jumps = [...root.querySelectorAll("[data-sample-go]")];
  if (!rail || cards.length === 0) return;

  const narrow = view.matchMedia("(max-width: 800px)");
  const reduce = view.matchMedia("(prefers-reduced-motion: reduce)");
  let observer;

  const markActive = (card) => {
    cards.forEach((item, index) => {
      const on = item === card;
      item.classList.toggle("is-active", on);
      jumps[index]?.setAttribute("aria-pressed", on ? "true" : "false");
    });
  };

  const apply = () => {
    observer?.disconnect();
    observer = undefined;
    cards.forEach((card) => card.classList.remove("is-active", "is-sharp"));
    if (reduce.matches) {
      root.dataset.motion = "still";
      rail.removeAttribute("tabindex");
      return;
    }
    if (narrow.matches) {
      root.dataset.motion = "swipe";
      rail.tabIndex = 0;
      if (view.IntersectionObserver) {
        observer = new view.IntersectionObserver((entries) => {
          const best = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (best) markActive(best.target);
        }, { root: rail, threshold: [0.55, 0.75] });
        cards.forEach((card) => observer.observe(card));
      }
      markActive(cards[0]);
      return;
    }
    rail.removeAttribute("tabindex");
    const supportsView = view.CSS?.supports?.("animation-timeline: view()")
      || view.CSS?.supports?.("animation-timeline", "view()");
    if (supportsView) {
      root.dataset.motion = "scroll";
      return;
    }
    root.dataset.motion = "observe";
    if (!view.IntersectionObserver) return;
    observer = new view.IntersectionObserver((entries) => {
      for (const entry of entries) entry.target.classList.toggle("is-sharp", entry.isIntersecting);
    }, { threshold: 0.35 });
    cards.forEach((card) => observer.observe(card));
  };

  jumps.forEach((button) => {
    button.addEventListener("click", () => {
      const card = cards[Number(button.getAttribute("data-sample-go"))];
      if (!card) return;
      card.scrollIntoView({
        behavior: reduce.matches ? "auto" : "smooth",
        inline: "center",
        block: "nearest",
      });
      markActive(card);
    });
  });

  apply();
  narrow.addEventListener?.("change", apply);
  reduce.addEventListener?.("change", apply);
}

if (typeof document !== "undefined" && document.querySelector?.("[data-samples]")) bootSamples(document);
