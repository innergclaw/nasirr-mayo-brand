import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const script = readFileSync(
  new URL("./scramble-title.js", import.meta.url),
  "utf8",
);

test("home page loads the standalone name animation", () => {
  assert.match(page, /scramble-title\.js\?v=1/);
  assert.match(page, /aria-label='NASIRR "G" MAYO'/);
  assert.match(script, /requestAnimationFrame/);
  assert.match(script, /1100/);
  assert.match(script, /38/);
});

test("name animation keeps the final title and reduced-motion support", () => {
  assert.match(script, /prefers-reduced-motion: reduce/);
  assert.match(script, /output\.textContent = text/);
  assert.match(script, /character === '\"'/);
});
