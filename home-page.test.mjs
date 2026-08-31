import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const mentorshipScript = await readFile(
  new URL("mentorship-entry.js", root),
  "utf8",
);
const mentorshipPage = await readFile(
  new URL("mentorship/index.html", root),
  "utf8",
);

test("home page has one featured mentorship card", () => {
  assert.equal(
    (html.match(/class="link-card mentorship-link-card mentorship-main-card is-visible"/g) ?? [])
      .length,
    1,
  );
});

test("featured mentorship card keeps one action", () => {
  assert.match(html, /href="mentorship\/"[\s\S]*EXPLORE MENTORSHIP/);
  assert.doesNotMatch(html, /mentorship-main-action-secondary/);
  assert.doesNotMatch(mentorshipScript, /MEMBER ACCESS/);
});

test("mentorship member access uses the Home Base pill style", () => {
  assert.match(mentorshipPage, /class="member-access"/);
  assert.match(mentorshipPage, /\.member-access \{[^}]*border-radius:999px/);
  assert.match(mentorshipPage, /\.member-access:active \{ transform:scale\(\.96\)/);
});

test("hire links lead the service list and mentorship follows the services", () => {
  assert.match(html, /HOW CAN I HELP YOU\?/);
  assert.doesNotMatch(html, /HIRE MY COMPANY TO HELP YOU/);
  assert.doesNotMatch(html, /HIRE ME LINKS/);
  assert.match(mentorshipScript, /HOW CAN I HELP YOU\?/);
  assert.match(mentorshipScript, /list\.classList\.add\("company-services"\)/);
  assert.match(mentorshipScript, /list\.prepend\(heading\)/);
  assert.match(mentorshipScript, /serviceCards\.forEach/);
  assert.match(mentorshipScript, /anchor\.insertAdjacentElement\("afterend", mainCard\)/);
  assert.match(html, /mentorship-entry\.js\?v=featured-5/);
});

test("home page removes hire link and names InnerG education", () => {
  assert.doesNotMatch(html, /HIRE \/ BOOK ME/);
  assert.match(html, /INNERG INTEL EDUCATION/);
});

test("restore script prevents duplicate cards and repeated number writes", () => {
  assert.match(mentorshipScript, /if \(!list\.querySelector\("\.mentorship-main-card"\)\)/);
  assert.match(mentorshipScript, /numberNode\.textContent !== number/);
});
