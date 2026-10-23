import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const home = await readFile(new URL("index.html", root), "utf8");
const script = await readFile(new URL("evil-eye.js", root), "utf8");
const styles = await readFile(new URL("evil-eye.css", root), "utf8");

test("home loads the evil eye header mark", () => {
  assert.match(home, /evil-eye\.css\?v=\d+/);
  assert.match(home, /evil-eye\.js\?v=\d+/);
});

test("the mark replaces the header logo accessibly and keeps attribution", () => {
  assert.match(script, /\.profile-header/);
  assert.match(script, /aria-label", "Nasirr G\. Mayo logo"/);
  assert.match(script, /MIT License, Copyright \(c\) 2026 Suraj Maurya/);
  assert.match(styles, /has-evil-eye \.profile-mark/);
});

test("the animation respects reduced motion and pauses when not visible", () => {
  assert.match(script, /prefers-reduced-motion: reduce/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /visibilitychange/);
});
