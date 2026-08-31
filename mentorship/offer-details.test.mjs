import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("index.html", import.meta.url), "utf8");

test("Founder Q&A is a 30-minute call for $25", () => {
  const founderCall = html.match(
    /<article[^>]*>[\s\S]*?<h3>Founder Q&amp;A Call<\/h3>[\s\S]*?<\/article>/,
  )?.[0];

  assert.ok(founderCall);
  assert.match(founderCall, /<p class="offer-price">\$25<\/p>/);
  assert.match(founderCall, /30 minutes · one focused conversation/);
  assert.doesNotMatch(founderCall, /20 minutes/);
  assert.match(
    founderCall,
    /href="https:\/\/cal\.com\/ownyourwebsmm\/founder-q-aa-call">BOOK NOW<\/a>/,
  );
});

test("monthly mentorship uses the flexible $75 to $175 support range", () => {
  assert.match(html, /type="range" min="75" max="175" step="5" value="125"/);
  assert.match(html, /Choose the support that fits\./);
  assert.match(html, /TEXT TO START AT \$125/);
  assert.doesNotMatch(html, /Weekly Accountability/);
  assert.doesNotMatch(html, /Personal Support/);
  assert.doesNotMatch(html, /buy\.stripe\.com/);
});
