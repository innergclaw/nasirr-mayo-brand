(() => {
  const slider = document.getElementById("mentorship-amount");
  const canvas = document.getElementById("mentorship-amount-canvas");
  const track = document.querySelector(".amount-slider__track");
  const digits = [...document.querySelectorAll(".rolling-digit")];
  const readout = document.getElementById("amount-readout");
  const level = document.getElementById("support-level");
  const detail = document.getElementById("support-level-detail");
  const start = document.getElementById("flexible-start");
  const ticks = [...document.querySelectorAll(".amount-slider__tick")];
  if (
    !slider ||
    !canvas ||
    !track ||
    !digits.length ||
    !readout ||
    !level ||
    !detail ||
    !start
  ) {
    return;
  }

  const minimum = Number(slider.min);
  const maximum = Number(slider.max);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const context = canvas.getContext("2d");
  const CELL = 6;
  const GAP = 1;
  const THUMB = 24;
  let frame = 0;
  let running = false;
  let visible = true;
  let width = 0;
  let height = 0;
  let phase = 0;
  let hintPhase = 0;
  let previousTime = performance.now();

  const plans = [
    {
      maximum: 95,
      name: "Accountability + Q&A",
      detail:
        "Use scheduled Q&A and accountability check-ins to make decisions, organize the next step, and keep moving.",
    },
    {
      maximum: 135,
      name: "Planning + accountability",
      detail:
        "Turn your goals into a practical monthly plan. Use scheduled check-ins to review progress and adjust the next move.",
    },
    {
      maximum: 170,
      name: "Hands-on roadmap support",
      detail:
        "Get hands-on planning help, a working roadmap, and scheduled direct support as you carry out the plan.",
    },
    {
      maximum: 175,
      name: "Custom roadmap + direct support",
      detail:
        "Build a custom monthly roadmap with hands-on planning and scheduled direct communication throughout the month.",
    },
  ];

  const hash = (x, y) => {
    const number = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return number - Math.floor(number);
  };

  const readAccent = () => getComputedStyle(track).color.trim() || "#caff37";

  const fraction = () =>
    Math.min(Math.max((Number(slider.value) - minimum) / (maximum - minimum), 0), 1);

  const resize = () => {
    if (!context) return;
    width = track.clientWidth;
    height = track.clientHeight;
    const density = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * density));
    canvas.height = Math.max(1, Math.round(height * density));
    context.setTransform(density, 0, 0, density, 0, 0);
    draw(performance.now());
  };

  const draw = (now) => {
    if (!context || !width || !height) return;
    const elapsed = Math.min((now - previousTime) / 1000, 0.05);
    previousTime = now;
    const fill = fraction();
    phase += elapsed * (0.3 + fill * 3.2);
    hintPhase += elapsed;
    context.clearRect(0, 0, width, height);
    const columns = Math.ceil(width / CELL);
    const rows = Math.ceil(height / CELL);
    const square = CELL - GAP;
    const fillPixels = THUMB / 2 + fill * (width - THUMB);
    const bandPixels = Math.max(1, fill * 0.6 * width);
    const hintStrength = 0.15 * (1 - fill);
    const accent = readAccent();

    for (let column = 0; column < columns; column += 1) {
      const cellPixels = column * CELL + CELL / 2;
      let columnBase = 0;
      let isTail = false;
      if (cellPixels <= fillPixels) {
        const band = 1 - (fillPixels - cellPixels) / bandPixels;
        if (band <= 0) continue;
        columnBase = band * band;
        isTail = true;
      } else {
        const reach = width - fillPixels;
        const along = reach > 0 ? (cellPixels - fillPixels) / reach : 0;
        const envelope = Math.sin(along * Math.PI);
        const pulse = 0.5 + 0.5 * Math.sin((cellPixels / width) * 5 - hintPhase * 4.5);
        columnBase = hintStrength * envelope * pulse;
        if (columnBase <= 0.002) continue;
      }

      for (let row = 0; row < rows; row += 1) {
        const randomPhase = hash(column, row) * Math.PI * 2;
        const staticStrength = 0.6 + 0.4 * hash(column + 7.3, row - 3.1);
        let animationStrength = 1;
        if (!reduceMotion.matches && isTail) {
          const flicker = Math.sin(
            phase * 2.4 + column * 0.9 + row * 0.4 + randomPhase,
          );
          animationStrength = 0.675 + 0.325 * flicker;
        } else if (!reduceMotion.matches) {
          const twinkle = 0.5 + 0.5 * Math.sin(phase * 1.7 + randomPhase);
          animationStrength = 0.6 + 0.4 * twinkle;
        }
        const alpha = Math.min(
          Math.max(columnBase * staticStrength * animationStrength, 0),
          1,
        );
        if (alpha < 0.015) continue;
        context.globalAlpha = alpha;
        context.fillStyle = accent;
        context.fillRect(column * CELL, row * CELL, square, square);
      }
    }
    context.globalAlpha = 1;
  };

  const loop = (now) => {
    draw(now);
    if (running) frame = window.requestAnimationFrame(loop);
  };

  const syncLoop = () => {
    const shouldRun = visible && !document.hidden && !reduceMotion.matches;
    if (shouldRun && !running) {
      running = true;
      previousTime = performance.now();
      frame = window.requestAnimationFrame(loop);
    } else if (!shouldRun && running) {
      running = false;
      window.cancelAnimationFrame(frame);
      draw(performance.now());
    }
  };

  const updateDigits = (amount) => {
    const characters = String(amount).padStart(3, " ").split("");
    digits.forEach((column, index) => {
      const character = characters[index];
      column.classList.toggle("is-empty", character === " ");
      const stack = column.querySelector(".rolling-digit__stack");
      if (stack && character !== " ") {
        stack.style.transform = `translateY(-${Number(character) * 0.9}em)`;
      }
    });
  };

  const update = () => {
    const amount = Number(slider.value);
    const plan = plans.find((option) => amount <= option.maximum) || plans.at(-1);
    updateDigits(amount);
    readout.setAttribute("aria-label", `$${amount} per month`);
    slider.setAttribute("aria-valuetext", `$${amount} per month. ${plan.name}`);
    level.textContent = plan.name;
    detail.textContent = plan.detail;
    start.textContent = `TEXT TO START AT $${amount}`;
    start.href = `sms:+12674730397?&body=${encodeURIComponent(
      `Hi Nasirr, I want to start monthly mentorship at $${amount}.`,
    )}`;
    start.setAttribute("aria-label", `Text Nasirr to start monthly mentorship at $${amount}`);
    ticks.forEach((tick) => {
      tick.classList.toggle("is-active", Number(tick.dataset.amount) <= amount);
    });
    draw(performance.now());
  };

  slider.addEventListener("input", update);
  slider.addEventListener("keydown", (event) => {
    const step = Number(slider.step) || 1;
    const changes = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      Home: minimum - Number(slider.value),
      End: maximum - Number(slider.value),
    };
    if (!(event.key in changes)) return;
    event.preventDefault();
    slider.value = String(
      Math.min(maximum, Math.max(minimum, Number(slider.value) + changes[event.key])),
    );
    update();
  });
  slider.addEventListener("change", () => {
    if (typeof navigator.vibrate === "function") navigator.vibrate(12);
  });
  reduceMotion.addEventListener("change", () => {
    syncLoop();
    draw(performance.now());
  });
  document.addEventListener("visibilitychange", syncLoop);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(track);
  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      visible = entry?.isIntersecting ?? true;
      syncLoop();
    },
    { threshold: 0.05 },
  );
  intersectionObserver.observe(track);

  update();
  resize();
  syncLoop();
})();
