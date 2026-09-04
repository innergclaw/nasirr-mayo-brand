import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const js = await readFile(new URL("./innergid.js", import.meta.url), "utf8");

test("landing page presents one paid INNERG ID path", () => {
  assert.match(html, /ACTIVE INNERG ID/);
  assert.match(html, /\$10/);
  assert.match(html, /\/ month/);
  assert.match(html, /One subscription\. Full ecosystem access\./);
  assert.doesNotMatch(html, /FREE MEMBERSHIP/);
  assert.doesNotMatch(html, /One-time purchase/);
  assert.equal((html.match(/class="choice-card/g) || []).length, 1);
});

test("sign in returns to the public INNERG ID page", () => {
  assert.match(html, /account\/\?next=%2Finnergid%2F/);
  assert.match(js, /account\/\?next=%2Finnergid%2F/);
});

test("member record comes from the authenticated server function", () => {
  assert.match(js, /innerg-member-access/);
  assert.match(js, /getSession/);
});

test("video preview uses a local MP4 and poster", () => {
  assert.match(html, /bull-cycle-preview\.mp4/);
  assert.match(html, /bull-cycle-poster\.jpg/);
});

test("member home uses the INNERG community badge", () => {
  assert.match(html, /innerg-member-badge\.png/);
  assert.match(html, /YOUR KEY TO INNERG/);
  assert.match(html, /Your number\. Your access\. Your place inside\./);
});

test("INNERG ID explains the included access", () => {
  assert.match(html, /The End-of-Year Frequency/);
  assert.match(html, /27-minute breakdown/);
  assert.match(html, /2026-2027 BULL SUPER CYCLE/);
  assert.match(html, /Direct member text access to Nasirr/);
  assert.match(html, /Member discounts on selected services/);
  assert.match(html, /Research Desk and Market Watchlist/);
  assert.match(html, /Media Hub and member-only releases/);
  assert.match(html, /Discord, resources, and future events/);
  assert.match(html, /Members-only Watchlist and daily financial investing insights/);
  assert.match(html, /WHO IS THIS FOR\?/);
  assert.equal((html.match(/class="reveal reveal-tile/g) || []).length, 7);
});

test("sections use progressive motion with an accessible fallback", () => {
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /prefers-reduced-motion/);
  assert.match(html, /hero-reveal/);
  assert.match(html, /reveal-section/);
});

test("purchase uses the monthly membership checkout", () => {
  assert.match(js, /innerg-membership-checkout/);
  assert.match(js, /membership.*success/);
  assert.match(js, /Open my INNERG ID/);
  assert.doesNotMatch(js, /innerg-video-checkout/);
});
