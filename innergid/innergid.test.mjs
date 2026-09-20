import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const js = await readFile(new URL("./innergid.js", import.meta.url), "utf8");
const css = await readFile(new URL("./innergid.css", import.meta.url), "utf8");

test("landing page presents membership and one-time briefing paths", () => {
  assert.match(html, /ACTIVE INNERG ID/);
  assert.match(html, /\$15/);
  assert.match(html, /\/ month/);
  assert.match(html, /Your ID\. Full ecosystem access\./);
  assert.match(html, /\$150 for 12 months/);
  assert.match(html, /\$19/);
  assert.match(html, /NO MEMBERSHIP REQUIRED/);
  assert.match(html, /href="\.\/briefing\/"/);
  assert.match(html, /No automatic renewal/);
  assert.doesNotMatch(html, /FREE MEMBERSHIP/);
  assert.equal((html.match(/class="choice-card/g) || []).length, 1);
});

test("sign in returns to the public INNERG ID page", () => {
  assert.match(html, /account\/\?next=%2Finnergid%2F/);
  assert.match(js, /account\/\?next=%2Finnergid%2F/);
});

test("member record comes from the authenticated server function", () => {
  assert.match(js, /innerg-member-access/);
  assert.match(js, /getSession/);
});

test("active members can sign out and return to the INNERG sign-in page", () => {
  assert.match(html, /id="member-sign-out"/);
  assert.match(html, />Sign out<\/button>/);
  assert.match(js, /supabase\.auth\.signOut\(\)/);
  assert.match(js, /location\.replace\("\.\.\/account\/\?next=%2Finnergid%2F"\)/);
  assert.match(js, /We could not sign you out\. Please try again\./);
});

test("video preview uses the widescreen Market Pulse export and its poster", () => {
  assert.match(html, /innerg-market-pulse-preview\.mp4/);
  assert.match(html, /innerg-market-pulse-preview-poster\.jpg/);
  assert.doesNotMatch(html, /bull-cycle-preview\.mp4|innerg-id-sunday-montage\.mp4/);
  assert.match(html, /width="1920" height="1080"/);
  assert.match(html, /controls playsinline preload="metadata"/);
  assert.match(html, /kind="captions"/);
  assert.match(html, /innerg-market-pulse-preview\.vtt/);
  assert.match(css, /aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(css, /object-fit:\s*contain/);
});

test("member home uses the INNERG community badge", () => {
  assert.match(html, /innerg-member-badge\.png/);
  assert.match(html, /YOUR KEY TO INNERG/);
  assert.match(html, /alt="INNERG Member badge"/);
});

test("INNERG ID explains the included access", () => {
  assert.match(html, /The End-of-Year Frequency/);
  assert.match(html, /27-minute breakdown/);
  assert.match(html, /2026-2027 BULL SUPER CYCLE/);
  assert.match(html, /Priority member questions and scheduled founder sessions/);
  assert.match(html, /Member discounts on selected services/);
  assert.match(html, /Research Desk and Market Watchlist/);
  assert.match(html, /Media Hub and member-only releases/);
  assert.match(html, /Discord, resources, and future events/);
  assert.match(html, /Who is this for\?/);
  assert.equal((html.match(/<li>/g) || []).length, 10);
});

test("landing page points to the verified Sunday trial and fact page", () => {
  assert.match(html, /five one-time seven-day trials open every sunday/i);
  assert.match(html, /href="\.\/sunday\/"/);
  assert.match(html, /href="\.\/about\/"/);
  assert.match(css, /\.sunday-drop-link/);
});

test("value paywall keeps comparisons honest and both plans clear", () => {
  assert.match(html, /Choose flexibility/);
  assert.match(html, /\$15 \/ month/);
  assert.match(html, /\$150 once/);
  assert.match(html, /Save \$30/);
  assert.match(html, /Existing \$10 monthly founding memberships keep their original rate/);
  assert.match(html, /Included with both plans/);
  assert.match(html, /top three weekly movers/);
  assert.match(html, /<table aria-describedby="comparison-note">/);
  assert.equal((html.match(/scope="col"/g) || []).length, 3);
  assert.doesNotMatch(html, /free trial|guaranteed return|guaranteed profit/i);
});

test("join action is not delayed by scroll animations", () => {
  assert.doesNotMatch(js, /IntersectionObserver/);
  assert.doesNotMatch(html, /hero-reveal|reveal-section|motion-ready/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /min-height: 50px/);
});

test("preview and purchase come before optional details", () => {
  assert.ok(html.indexOf('<video') < html.indexOf('class="card-action purchase-action"'));
  assert.ok(html.indexOf('class="card-action purchase-action"') < html.indexOf('<details '));
  assert.equal((html.match(/<details\b/g) || []).length, 3);
  assert.equal((html.match(/purchase-action/g) || []).length, 1);
  assert.match(html, /Sign in or create your account, then pay securely/);
});

test("purchase uses the monthly membership checkout", () => {
  assert.match(js, /innerg-membership-checkout/);
  assert.match(js, /membership.*success/);
  assert.match(html, /Open my INNERG ID/);
  assert.doesNotMatch(js, /innerg-video-checkout/);
  assert.match(html, /See the \$19 briefing/);
});
