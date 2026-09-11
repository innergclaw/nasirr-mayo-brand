import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const aboutHtml = html.match(/<div class="about-copy">[\s\S]*?<\/div>/)?.[0] ?? "";
const mentorshipScript = await readFile(
  new URL("mentorship-entry.js", root),
  "utf8",
);
const mentorshipPage = await readFile(
  new URL("mentorship/index.html", root),
  "utf8",
);

test("home page removes the investing card and cannot restore it after loading", () => {
  for (const source of [html, mentorshipScript]) {
    assert.doesNotMatch(source, /NEW TO INVESTING\?|featured-investing-title/);
    assert.doesNotMatch(source, /join\.robinhood\.com\/nasirrm/);
  }
  assert.doesNotMatch(mentorshipScript, /buildCard|mentorship-main-card/);
});

test("the separate watchlist referral remains unchanged", async () => {
  const watchlist = await readFile(new URL("watchlist/index.html", root), "utf8");
  assert.match(watchlist, /join\.robinhood\.com\/nasirrm/);
});

test("mentorship member access uses the Home Base pill style", () => {
  assert.match(mentorshipPage, /class="member-access"/);
  assert.match(mentorshipPage, /\.member-access \{[^}]*border-radius:999px/);
  assert.match(mentorshipPage, /\.member-access:active \{ transform:scale\(\.96\)/);
});

test("hire links lead the service list and booking follows", () => {
  assert.match(html, /HOW CAN I HELP YOU\?/);
  assert.doesNotMatch(html, /HIRE MY COMPANY TO HELP YOU/);
  assert.doesNotMatch(html, /HIRE ME LINKS/);
  assert.match(mentorshipScript, /HOW CAN I HELP YOU\?/);
  assert.match(mentorshipScript, /list\.classList\.add\("company-services"\)/);
  assert.match(mentorshipScript, /list\.prepend\(heading\)/);
  assert.match(mentorshipScript, /serviceCards\.forEach/);
  assert.match(mentorshipScript, /anchor\.insertAdjacentElement\("afterend", booking\)/);
  assert.match(html, /business-booking\.js\?v=6/);
  assert.match(html, /mentorship-entry\.js\?v=services-9/);
});

test("home page removes hire link and names InnerG education", () => {
  assert.doesNotMatch(html, /HIRE \/ BOOK ME/);
  assert.match(html, /INNERG INTEL EDUCATION/);
});

test("about section uses the approved Philadelphia founder biography", () => {
  assert.match(aboutHtml, /Philadelphia-based creative entrepreneur and educator/);
  assert.match(aboutHtml, /owner and lead\s+designer of NGVISIONS/);
  assert.match(aboutHtml, /Through InnerG Intel and\s+InnerG Reads/);
  assert.match(aboutHtml, /help Philadelphia youth move from ideas to practical\s+business skills/);
  assert.doesNotMatch(aboutHtml, /I started building in 2015 because I saw problems/);
});

test("service restore script prevents duplicate headings and repeated number writes", () => {
  assert.match(mentorshipScript, /headings\.forEach\(\(duplicate\) => duplicate\.remove\(\)\)/);
  assert.match(mentorshipScript, /numberNode\.textContent !== number/);
});
