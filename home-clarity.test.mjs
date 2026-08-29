import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const home = await readFile(new URL("index.html", root), "utf8");
const script = await readFile(new URL("home-clarity.js", root), "utf8");
const styles = await readFile(new URL("home-clarity.css", root), "utf8");

test("home loads the one-page clarity layer", () => {
  assert.match(home, /home-clarity\.css\?v=1/);
  assert.match(home, /home-clarity\.js\?v=1/);
});

test("top actions lead to booking and official channels", () => {
  assert.match(script, /href="#talk-business">BOOK ME/);
  assert.match(script, /href="#\$\{sectionId\}">FIND MY CHANNELS/);
  assert.match(script, /I help founders, creatives, and business owners/);
  assert.match(script, /bookingLabel\.textContent = "BOOK NASIRR"/);
  assert.match(script, /bookingTitle\.textContent = "Get the right help for the work\."/);
  assert.match(script, /bookingLabel\.textContent !== "BOOK NASIRR"/);
  assert.match(script, /Nasirr G\. Mayo helps founders, creatives, and business owners/);
});

test("official channel directory uses verified public links", () => {
  for (const url of [
    "https://www.instagram.com/shopnasgfx/",
    "https://www.instagram.com/innergintel/",
    "https://www.youtube.com/@innergintel",
    "https://open.substack.com/pub/innergintelligence",
    "https://www.linkedin.com/in/nasirr-mayo-40647525a",
    "https://x.com/InnerGNas",
    "https://github.com/innergclaw",
  ]) {
    assert.match(script, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("the page removes duplicate icon menus and keeps touch targets", () => {
  assert.match(script, /profile-header > \.social-menu/);
  assert.match(script, /link-tree-footer > \.social-menu/);
  assert.match(styles, /min-height:\s*44px/);
  assert.match(styles, /transform:\s*scale\(0\.96\)/);
  assert.doesNotMatch(styles, /transition:\s*all/);
});
