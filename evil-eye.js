/*
 * Evil Eye header mark for Home Base.
 * Vanilla port of the "Evil Eye" component from EasyUI by Suraj Maurya
 * (https://easyui.site/components/evil-eye, https://github.com/Surajmaurya1/easyui).
 * Original work: MIT License, Copyright (c) 2026 Suraj Maurya.
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files, to deal in the Software without restriction,
 * subject to including the above copyright notice and this permission notice in all copies
 * or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY
 * OF ANY KIND. Full license text: https://github.com/Surajmaurya1/easyui/blob/main/LICENSE
 *
 * Changes from the original: React and framer-motion replaced by a small spring loop,
 * the cord lengthened so it meets the cap, cropped to the cord and disc so it fits the logo slot, a gentle idle sway added for
 * touch screens, and the loop pauses when offscreen, when the tab is hidden, or when
 * the visitor prefers reduced motion.
 */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const CX = 180, CY = 280, R = 118, AX = 180;
  const markup = `
<svg viewBox="40 -6 280 410" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="ee-disc-body" cx="38%" cy="32%" r="78%"><stop offset="0%" stop-color="#3A55B0"/><stop offset="55%" stop-color="#1B2C73"/><stop offset="100%" stop-color="#0A1340"/></radialGradient>
    <radialGradient id="ee-disc-shadow" cx="65%" cy="80%" r="55%"><stop offset="0%" stop-color="#04082A" stop-opacity="0.55"/><stop offset="100%" stop-color="#04082A" stop-opacity="0"/></radialGradient>
    <radialGradient id="ee-disc-highlight" cx="32%" cy="22%" r="22%"><stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.45"/><stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
    <radialGradient id="ee-disc-rim" cx="50%" cy="50%" r="50%"><stop offset="92%" stop-color="#3A55B0" stop-opacity="0"/><stop offset="100%" stop-color="#3A55B0" stop-opacity="0.9"/></radialGradient>
    <radialGradient id="ee-ring-white" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#D8DCEA"/></radialGradient>
    <radialGradient id="ee-ring-blue" cx="40%" cy="35%" r="60%"><stop offset="0%" stop-color="#A6D9F2"/><stop offset="100%" stop-color="#5FA8DA"/></radialGradient>
    <radialGradient id="ee-pupil" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#1B2C73"/><stop offset="100%" stop-color="#04082A"/></radialGradient>
    <linearGradient id="ee-cap-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#D8D8E0"/><stop offset="50%" stop-color="#9C9CA8"/><stop offset="100%" stop-color="#6A6A78"/></linearGradient>
    <linearGradient id="ee-cap-rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#5A5A66"/><stop offset="50%" stop-color="#E8E8F0"/><stop offset="100%" stop-color="#5A5A66"/></linearGradient>
    <linearGradient id="ee-cord" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#1F3FB0"/><stop offset="50%" stop-color="#4F7AE8"/><stop offset="100%" stop-color="#1F3FB0"/></linearGradient>
  </defs>
  <g class="ee-body">
    <g class="ee-cord">
      <path d="M${AX - 14} 0 C ${AX - 22} 50, ${AX - 6} 110, ${AX - 5} 160" stroke="url(#ee-cord)" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M${AX - 14} 0 C ${AX - 22} 50, ${AX - 6} 110, ${AX - 5} 160" stroke="#A8C4F5" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-dasharray="3 3" opacity="0.85"/>
      <path d="M${AX + 14} 0 C ${AX + 22} 50, ${AX + 6} 110, ${AX + 5} 160" stroke="url(#ee-cord)" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M${AX + 14} 0 C ${AX + 22} 50, ${AX + 6} 110, ${AX + 5} 160" stroke="#A8C4F5" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-dasharray="3 3" opacity="0.85"/>
    </g>
    <g class="ee-cap">
      <rect x="${CX - 18}" y="${CY - R - 4}" width="36" height="22" rx="6" fill="url(#ee-cap-body)"/>
      <rect x="${CX - 18}" y="${CY - R + 14}" width="36" height="4" fill="url(#ee-cap-rim)" opacity="0.7"/>
      <rect x="${CX - 1.5}" y="${CY - R - 4}" width="3" height="22" fill="#3A3A44" opacity="0.9"/>
      <ellipse cx="${CX - 8}" cy="${CY - R + 4}" rx="8" ry="2" fill="#FFFFFF" opacity="0.4"/>
    </g>
    <g class="ee-disc">
      <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#ee-disc-body)"/>
      <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#ee-disc-shadow)"/>
      <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#ee-disc-rim)"/>
      <ellipse cx="${CX - 36}" cy="${CY - 48}" rx="36" ry="22" fill="url(#ee-disc-highlight)"/>
      <circle cx="${CX}" cy="${CY}" r="${R * 0.72}" fill="url(#ee-ring-white)"/>
      <circle cx="${CX}" cy="${CY}" r="${R * 0.48}" fill="url(#ee-ring-blue)"/>
      <circle cx="${CX}" cy="${CY}" r="${R * 0.26}" fill="url(#ee-pupil)"/>
      <ellipse cx="${CX - R * 0.08}" cy="${CY - R * 0.1}" rx="6" ry="4" fill="#FFFFFF" opacity="0.9"/>
      <circle cx="${CX + R * 0.1}" cy="${CY + R * 0.08}" r="1.6" fill="#FFFFFF" opacity="0.7"/>
    </g>
  </g>
</svg>`;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  const build = () => {
    const mark = document.createElement("span");
    mark.className = "evil-eye-mark";
    mark.setAttribute("role", "img");
    mark.setAttribute("aria-label", "Nasirr G. Mayo logo");
    mark.innerHTML = markup;
    return mark;
  };

  const animate = (mark) => {
    const svg = mark.querySelector("svg");
    const body = svg.querySelector(".ee-body");
    const cord = svg.querySelector(".ee-cord");
    const cap = svg.querySelector(".ee-cap");
    const disc = svg.querySelector(".ee-disc");
    // Springs ported from the original: stiffness 55 / 45, damping 9 / 10, mass 1.8 / 1.6.
    const sx = { v: 0, x: 0, k: 55, c: 9, m: 1.8 };
    const sy = { v: 0, x: 0, k: 45, c: 10, m: 1.6 };
    let px = 0, py = 0, pointerAt = 0, running = false, visible = true, last = 0, raf = 0;

    const lerp = (v, a, b) => a + ((v + 1) / 2) * (b - a);
    const paint = () => {
      const x = Math.max(-1.4, Math.min(1.4, sx.x));
      body.setAttribute("transform", `translate(0 ${lerp(sy.x, -5, 5).toFixed(2)}) rotate(${lerp(x, -13, 13).toFixed(2)} ${AX} 0)`);
      cord.setAttribute("transform", `rotate(${lerp(x, -9, 9).toFixed(2)} ${AX} 0)`);
      cap.setAttribute("transform", `rotate(${lerp(x, -7, 7).toFixed(2)} ${CX} ${CY - R + 10})`);
      disc.setAttribute("transform", `rotate(${lerp(x, -5, 5).toFixed(2)} ${CX} ${CY})`);
    };
    const step = (s, target, dt) => {
      const a = (-s.k * (s.x - target) - s.c * s.v) / s.m;
      s.v += a * dt; s.x += s.v * dt;
    };
    const frame = (now) => {
      raf = 0;
      if (!running) return;
      const dt = Math.min(0.032, (now - (last || now)) / 1000) || 0.016;
      last = now;
      const idle = now - pointerAt > 1800;
      // Gentle idle sway so the charm still feels alive on touch screens.
      const tx = idle ? Math.sin(now / 1100) * 0.45 : px;
      const ty = idle ? Math.sin(now / 900) * 0.25 : py;
      for (let i = 0; i < 2; i += 1) { step(sx, tx, dt / 2); step(sy, ty, dt / 2); }
      paint();
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running || reduce.matches || !visible || document.hidden) return;
      running = true; last = 0; raf = requestAnimationFrame(frame);
    };
    const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
    const sync = () => (reduce.matches || !visible || document.hidden ? stop() : start());

    const onPointer = (event) => {
      const r = mark.getBoundingClientRect();
      if (!r.width) return;
      const x = (event.clientX - (r.left + r.width / 2)) / (r.width * 2);
      const y = (event.clientY - (r.top + r.height / 2)) / (r.height * 2);
      if (Math.abs(x) > 3 || Math.abs(y) > 3) return;
      px = Math.max(-1, Math.min(1, x));
      py = Math.max(-1, Math.min(1, y));
      pointerAt = performance.now();
    };
    const onTap = () => { sx.v += 6; pointerAt = performance.now() - 1500; };

    window.addEventListener("pointermove", onPointer, { passive: true });
    mark.addEventListener("pointerdown", onTap, { passive: true });
    document.addEventListener("visibilitychange", sync);
    reduce.addEventListener?.("change", () => { sync(); if (reduce.matches) { sx.x = sy.x = 0; paint(); } });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; sync(); }).observe(mark);
    }
    paint();
    sync();
  };

  const mount = () => {
    const header = document.querySelector(".profile-header");
    const logo = header?.querySelector(".profile-mark");
    if (!header || !logo) return;
    if (header.querySelector(".evil-eye-mark")) return;
    const mark = build();
    logo.insertAdjacentElement("beforebegin", mark);
    header.classList.add("has-evil-eye");
    animate(mark);
  };

  const start = () => {
    mount();
    new MutationObserver(mount).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
