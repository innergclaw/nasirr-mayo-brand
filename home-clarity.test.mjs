import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const home = await readFile(new URL("index.html", root), "utf8");
const script = await readFile(new URL("home-clarity.js", root), "utf8");
const styles = await readFile(new URL("home-clarity.css", root), "utf8");

test("home loads the one-page clarity layer", () => {
  assert.match(home, /home-clarity\.css\?v=6/);
  assert.match(home, /home-clarity\.js\?v=6/);
});

test("scroll order places the video under official channels", () => {
  assert.match(script, /role\.insertAdjacentElement\("afterend", about\)/);
  assert.match(script, /const orderedSections = \[/);
  assert.match(script, /document\.getElementById\(sectionId\),[\s\S]*video,[\s\S]*linkList,[\s\S]*ambassador,[\s\S]*footer/);
});

test("top actions lead to booking, services, and official channels", () => {
  assert.match(script, /href="#talk-business">SPEAK WITH ME/);
  assert.match(script, /href="#how-can-i-help">WORK WITH ME/);
  assert.match(script, /href="#\$\{sectionId\}">FIND MY CHANNELS/);
  assert.match(home, /id="how-can-i-help"/);
  assert.match(styles, /#how-can-i-help\s*{[\s\S]*scroll-margin-top:\s*96px/);
  assert.match(script, /I help founders, creatives, and business owners/);
  assert.doesNotMatch(script, /This is the main place to find my work/);
  assert.match(script, /founder-footer-quote/);
  assert.match(script, /bookingLabel\.textContent = "SPEAK WITH ME"/);
  assert.match(script, /bookingTitle\.textContent = "Get the right help for the work\."/);
  assert.match(script, /bookingLabel\.textContent !== "SPEAK WITH ME"/);
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
  ]) {
    assert.match(script, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(script, /https:\/\/github\.com\/innergclaw/);
});

test("company services heading stays on one line", () => {
  assert.match(styles, /font-size:\s*clamp\(17px, 4\.5vw, 30px\)/);
  assert.match(styles, /white-space:\s*nowrap/);
});

test("scheduled calls use phone icons and Odyssey uses the featured glow", async () => {
  const booking = await readFile(new URL("business-booking.js", root), "utf8");
  const odysseyScript = await readFile(new URL("odyssey-card.js", root), "utf8");
  const odyssey = await readFile(new URL("odyssey-card.css", root), "utf8");
  assert.equal((booking.match(/talk-business-icon/g) ?? []).length, 2);
  assert.match(booking, /featuredCard\.insertAdjacentElement\("beforebegin", section\)/);
  assert.doesNotMatch(booking, /new MutationObserver/);
  assert.match(odysseyScript, /const anchor = linkList \|\| booking \|\| video/);
  assert.match(home, /odyssey-card\.js\?v=4/);
  assert.match(odyssey, /border-radius:\s*18px/);
  assert.match(odyssey, /conic-gradient/);
  assert.match(odyssey, /animation:\s*odyssey-border-spin/);
  assert.match(odyssey, /prefers-reduced-motion:\s*reduce/);
});

test("the page removes duplicate icon menus and keeps touch targets", () => {
  assert.match(script, /profile-header > \.social-menu/);
  assert.match(script, /link-tree-footer > \.social-menu/);
  assert.match(styles, /min-height:\s*44px/);
  assert.match(styles, /transform:\s*scale\(0\.96\)/);
  assert.doesNotMatch(styles, /transition:\s*all/);
});
