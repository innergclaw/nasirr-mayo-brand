import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const css = await readFile(new URL("./about.css", import.meta.url), "utf8");

test("the fact page defines INNERG INTEL and its framework", () => {
  assert.match(html, /a learning and ownership system built by nasirr g\. mayo/);
  assert.match(html, /learn the system\./);
  assert.match(html, /recode the mind\./);
  assert.match(html, /build the future\./);
});

test("new visitors can find the mission, access model, and boundaries", () => {
  assert.match(html, /the facts new people should know/);
  assert.match(html, /one verified identity that connects a person to their access/);
  assert.match(html, /not a get-rich-quick trading room/);
  assert.match(html, /no guaranteed returns and no random stock picks/);
  assert.match(html, /five one-time seven-day trials open each sunday/);
});

test("the fact page connects the public INNERG ecosystem", () => {
  for (const destination of ["/watchlist/", "https://www.innergreads.study/", "https://innergintelligence.substack.com/", "https://www.youtube.com/@innergintel", "../sunday/"]) {
    assert.match(html, new RegExp(destination.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("the page inherits the established design and supports mobile and reduced motion", () => {
  assert.match(html, /sunday\.css/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible|quiet-link/);
});
