import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const js = await readFile(new URL("./membership.js", import.meta.url), "utf8");

test("landing page presents only the free member and paid video paths", () => {
  assert.match(html, /FREE MEMBERSHIP/);
  assert.match(html, /VIDEO ACCESS/);
  assert.equal((html.match(/class="choice-card/g) || []).length, 2);
});

test("free path returns through the account allowlisted destination", () => {
  assert.match(html, /account\/\?next=%2Fmembership%2F/);
});

test("member record comes from the authenticated server function", () => {
  assert.match(js, /innerg-member-access/);
  assert.match(js, /getSession/);
});

test("video preview uses a local MP4 and poster", () => {
  assert.match(html, /bull-cycle-preview\.mp4/);
  assert.match(html, /bull-cycle-poster\.jpg/);
});

test("paid offer explains the 27-minute video and fixed price", () => {
  assert.match(html, /The End-of-Year Frequency/);
  assert.match(html, /27-minute breakdown/);
  assert.match(html, /2026-2027 BULL SUPER CYCLE/);
  assert.doesNotMatch(html, /2026 market cycle/i);
  assert.match(html, /tokenization/);
  assert.match(html, /stablecoins/);
  assert.match(html, /Dollar-cost averaging/);
  assert.match(html, /diversification/);
  assert.match(html, /stock and ETF watchlist/);
  assert.match(html, /\$10/);
  assert.match(html, /One-time purchase/);
  assert.match(html, /not financial advice/i);
});

test("purchase uses authenticated checkout and protected video access", () => {
  assert.match(js, /innerg-video-checkout/);
  assert.match(js, /videoAccess/);
  assert.match(js, /videoUrl/);
  assert.match(js, /account\/\?next=%2Fmembership%2F/);
});
