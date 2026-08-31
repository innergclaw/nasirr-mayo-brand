import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const home = await readFile(new URL("index.html", root), "utf8");
const script = await readFile(new URL("home-motion.js", root), "utf8");
const styles = await readFile(new URL("home-motion.css", root), "utf8");

test("Home Base loads the stronger scroll entrance system", () => {
  assert.match(home, /home-motion\.css\?v=1/);
  assert.match(home, /home-motion\.js\?v=1/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /MutationObserver/);
  assert.match(script, /prefers-reduced-motion: reduce/);
  assert.match(script, /\.social-stats__card/);
  assert.match(script, /\.official-channel/);
  assert.match(script, /\.company-services > \.link-card/);
  assert.match(script, /\.talk-business-action/);
});

test("Home Base motion uses strong staggered movement and restores interactions", () => {
  assert.match(styles, /--home-motion-duration: 980ms/);
  assert.match(styles, /--home-motion-x: -96px/);
  assert.match(styles, /--home-motion-x: 96px/);
  assert.match(styles, /filter: blur\(12px\)/);
  assert.match(styles, /scale\(0\.92\)/);
  assert.match(styles, /overflow-x: clip/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(script, /animationend/);
  assert.match(script, /homeMotionShown = "true"/);
});
