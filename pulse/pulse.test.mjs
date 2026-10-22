import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COPY, interpret, tokenFromSearch } from "./pulse.js";

const banned = /—|artificial intelligence|\bAI\b|ImportInfo/;

test("signup states are explicit", () => {
  assert.equal(interpret("subscribe", "code_sent").title, "Code sent");
  assert.match(interpret("subscribe", "code_sent").message, /15 minutes/);
  assert.equal(interpret("confirm", "invalid_code").title, "Code not accepted");
  assert.match(interpret("confirm", "invalid_code").message, /wrong or expired/);
  assert.equal(interpret("confirm", "confirmed").title, "You're confirmed");
  assert.match(interpret("confirm", "confirmed").message, /This is news, not financial advice\./);
  assert.equal(interpret("subscribe", "rate_limited").tone, "error");
  assert.equal(interpret("unsubscribe", "unsubscribed").view, "done");
  assert.equal(interpret("unsubscribe", "invalid_token").title, "Link not valid");
});

test("unsubscribe tokens are 64 hex characters", () => {
  assert.equal(tokenFromSearch("?token=" + "ab".repeat(32)).length, 64);
  assert.equal(tokenFromSearch("?token=short"), "");
  assert.equal(tokenFromSearch(""), "");
});

test("public pages use the market desk voice", async () => {
  const files = ["index.html", "unsubscribe/index.html", "pulse.css", "pulse.js", "samples.js", "SETUP.md"];
  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, banned, file);
  }
  const page = await readFile(new URL("index.html", import.meta.url), "utf8");
  assert.match(page, /This is news, not financial advice\./);
  assert.match(page, /Your email is only used for INNERG PULSE\. Unsubscribe anytime\./);
  assert.match(page, /Market news recaps on US stocks and digital assets\./);
  assert.match(page, /name="pulse_hp"/);
  assert.match(page, /id="code-form" hidden/);
  assert.match(page, /id="done-panel" hidden/);
  assert.match(page, /data-pulse-page="signup"/);
  assert.match(page, /minlength="8" maxlength="8" pattern="\[0-9\]\{8\}"/);
  assert.match(page, /src="\.\.\/innergid\/assets\/innerg-member-badge\.png"/);
  assert.match(page, /alt="INNERG member badge"/);
  assert.match(page, /canonical" href="https:\/\/nasirr\.innergintel\.org\/pulse\/"/);
  assert.match(page, /id="samples"/);
  assert.match(page, /See what you get/);
  assert.match(page, /Pre-market ~ 8:15 AM ET/);
  assert.match(page, /After the close ~ 6:15 PM ET/);
  assert.match(page, /What to watch next trading day/);
  assert.equal((page.match(/SAMPLE/g) || []).length, 2);
  assert.equal((page.match(/<h4>US stocks<\/h4>/g) || []).length, 2);
  assert.equal((page.match(/<h4>Digital assets<\/h4>/g) || []).length, 2);
  assert.equal((page.match(/Example data, not a live reading\./g) || []).length, 2);
  assert.equal((page.match(/This is news, not financial advice\./g) || []).length, 5);
  const motion = await readFile(new URL("samples.js", import.meta.url), "utf8");
  const css = await readFile(new URL("pulse.css", import.meta.url), "utf8");
  assert.match(motion, /IntersectionObserver/);
  assert.match(motion, /prefers-reduced-motion/);
  assert.match(css, /animation-timeline: view\(\)/);
  assert.match(css, /blur\(8px\)/);
  assert.match(css, /scale\(0\.96\)/);
  assert.match(css, /data-motion="swipe"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(page, /id="email-form"/);
  assert.match(page, /id="code-form" hidden/);
  const leave = await readFile(new URL("unsubscribe/index.html", import.meta.url), "utf8");
  assert.match(leave, /data-pulse-page="unsubscribe"/);
  assert.match(leave, /noindex/);
  assert.match(leave, /no-referrer/);
  assert.match(Object.values(COPY).join("\n"), /wrong or expired/);
});
