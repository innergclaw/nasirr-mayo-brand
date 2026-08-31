(() => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@%&";

  const scramble = (text, progress) => {
    const revealed = Math.floor(progress * text.length);
    return Array.from(text, (character, index) => {
      if (
        character === " " ||
        character === '"' ||
        index < revealed ||
        progress >= 1
      ) {
        return character;
      }
      return characters[Math.floor(Math.random() * characters.length)];
    }).join("");
  };

  const animateTitle = () => {
    const title = document.querySelector(".scramble-title");
    const output = title?.querySelector(".scramble-title-output");
    const text = title?.getAttribute("aria-label")?.trim();
    if (!title || !output || !text || title.dataset.scrambleComplete) return;

    title.dataset.scrambleComplete = "true";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      output.textContent = text;
      return;
    }

    let animationFrame = 0;
    let startedAt = 0;
    let lastUpdate = 0;

    const step = (time) => {
      if (!startedAt) startedAt = time;
      const progress = Math.min((time - startedAt) / 1100, 1);

      if (time - lastUpdate >= 38 || progress === 1) {
        output.textContent = scramble(text, progress);
        lastUpdate = time;
      }

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        output.textContent = text;
      }
    };

    output.textContent = scramble(text, 0);
    animationFrame = window.requestAnimationFrame(step);

    window.addEventListener(
      "pagehide",
      () => window.cancelAnimationFrame(animationFrame),
      { once: true },
    );
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", animateTitle, { once: true });
  } else {
    animateTitle();
  }
})();
