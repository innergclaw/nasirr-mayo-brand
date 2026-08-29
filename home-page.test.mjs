import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const mentorshipScript = await readFile(
  new URL("mentorship-entry.js", root),
  "utf8",
);

test("home page has one featured mentorship card", () => {
  assert.equal(
    (html.match(/class="link-card mentorship-link-card mentorship-main-card is-visible"/g) ?? [])
      .length,
    1,
  );
});

test("featured mentorship card includes both required actions", () => {
  assert.match(html, /href="mentorship\/"[\s\S]*EXPLORE MENTORSHIP/);
  assert.match(html, /href="account\/"[\s\S]*MEMBER ACCESS/);
});

test("hire links heading sits between mentorship and links 01 through 04", () => {
  const mentorshipIndex = html.indexOf("mentorship-main-card is-visible");
  const headingIndex = html.indexOf('id="hire-links-title"');
  const firstLinkIndex = html.indexOf(">01</span");

  assert.ok(mentorshipIndex >= 0);
  assert.ok(headingIndex > mentorshipIndex);
  assert.ok(firstLinkIndex > headingIndex);
});

test("home page removes hire link and names InnerG education", () => {
  assert.doesNotMatch(html, /HIRE \/ BOOK ME/);
  assert.match(html, /INNERG INTEL EDUCATION/);
});

test("restore script prevents duplicate cards and repeated number writes", () => {
  assert.match(mentorshipScript, /if \(!list\.querySelector\("\.mentorship-main-card"\)\)/);
  assert.match(mentorshipScript, /numberNode\.textContent !== number/);
});
