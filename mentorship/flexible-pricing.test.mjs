import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const script = await readFile(new URL("flexible-pricing.js", root), "utf8");
const styles = await readFile(new URL("flexible-pricing.css", root), "utf8");

test("flexible pricing uses the attached slider behavior without React", () => {
  assert.match(html, /flexible-pricing\.css\?v=1/);
  assert.match(html, /flexible-pricing\.js\?v=1/);
  assert.match(script, /requestAnimationFrame/);
  assert.match(script, /ResizeObserver/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /prefers-reduced-motion: reduce/);
  assert.match(script, /CELL = 6/);
  assert.match(script, /THUMB = 24/);
});

test("the amount changes the support plan and selected text message", () => {
  assert.match(script, /Accountability \+ Q&A/);
  assert.match(script, /Planning \+ accountability/);
  assert.match(script, /Hands-on roadmap support/);
  assert.match(script, /Custom roadmap \+ direct support/);
  assert.match(script, /TEXT TO START AT \$\$\{amount\}/);
  assert.match(script, /start\.href = `sms:\+12674730397/);
  assert.match(script, /aria-valuetext/);
  assert.match(script, /ArrowRight/);
  assert.match(script, /Home: minimum/);
  assert.match(script, /End: maximum/);
});

test("the native slider keeps keyboard focus and touch size", () => {
  assert.match(styles, /height: 44px/);
  assert.match(styles, /focus-visible/);
  assert.match(styles, /transform: scale\(0\.96\)/);
  assert.doesNotMatch(styles, /transition:\s*all/);
});
