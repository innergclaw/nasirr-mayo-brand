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

test("Weekly Accountability keeps its separate 20-minute call length", () => {
  assert.match(
    html,
    /<h3>Weekly Accountability<\/h3>[\s\S]*?Four 20-minute calls/,
  );
});
