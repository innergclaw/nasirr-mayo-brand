import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const memberPages = [
  "./account/index.html",
  "./dashboard/index.html",
  "./innerg-id/index.html",
  "./innergid/index.html",
];

for (const page of memberPages) {
  test(`${page} includes the shared INNERG channel footer`, async () => {
    const html = await readFile(new URL(page, import.meta.url), "utf8");
    assert.match(html, /member-footer\.css/);
    assert.match(html, /class="member-social-footer"/);
    assert.match(html, /aria-label="INNERG public channels"/);
    assert.match(html, /https:\/\/www\.youtube\.com\/@innergintel/);
    assert.match(html, /https:\/\/open\.substack\.com\/pub\/innergintelligence/);
    assert.match(html, /https:\/\/www\.tiktok\.com\/@innergintel/);
    assert.match(html, /rel="noopener noreferrer"/);
  });
}
