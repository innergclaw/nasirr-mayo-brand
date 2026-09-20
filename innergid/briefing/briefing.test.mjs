import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const css = await readFile(new URL("./briefing.css", import.meta.url), "utf8");
const js = await readFile(new URL("./briefing.js", import.meta.url), "utf8");
const accessFunction = await readFile(new URL("../../supabase/functions/innerg-video-access/index.ts", import.meta.url), "utf8");
const checkoutFunction = await readFile(new URL("../../supabase/functions/innerg-video-checkout/index.ts", import.meta.url), "utf8");

test("briefing page keeps membership and one-time purchase distinct", () => {
  assert.match(html, /\$19/);
  assert.match(html, /no membership required/i);
  assert.match(html, /Active INNERG members and seven-day trial members already have access/);
  assert.match(html, /See \$15 monthly and \$150 annual access/);
  assert.match(html, /Pricing discussed in the recording reflects when it was made/);
  assert.match(html, /Existing \$10 founding memberships keep their original rate/);
});

test("briefing sign-in returns to the protected buyer route", () => {
  assert.match(html, /account\/\?next=%2Finnergid%2Fbriefing%2F/);
  assert.match(js, /account\/\?next=%2Finnergid%2Fbriefing%2F/);
});

test("briefing checkout and access require verified server functions", () => {
  assert.match(js, /innerg-video-access/);
  assert.match(js, /innerg-video-checkout/);
  assert.match(js, /getSession/);
  assert.match(js, /Do not start another checkout/);
  assert.doesNotMatch(js, /Payment received|Payment confirmed/);
});

test("buyer player uses expiring signed chapter links", () => {
  assert.match(html, /id="briefing-video"/);
  assert.match(html, /kind="captions"/);
  assert.match(js, /data\.chapters/);
  assert.match(js, /new Blob\(\[selected\.captions\], \{ type: "text\/vtt" \}\)/);
  assert.match(accessFunction, /createSignedUrl\(path, 3600\)/);
  assert.match(accessFunction, /Deno\.readTextFile/);
  assert.match(accessFunction, /accessType: memberAccess \? "membership" : "purchase"/);
  assert.equal((accessFunction.match(/end-of-year-frequency-2026-hq-chapter-/g) || []).length, 6);
});

test("checkout locks the new price and durable idempotency", () => {
  assert.match(checkoutFunction, /const PRICE_CENTS = 1900/);
  assert.match(checkoutFunction, /innerg_video_checkout_attempts/);
  assert.match(checkoutFunction, /idempotencyKey: "innerg-video-checkout:" \+ attempt\.attempt_id/);
  assert.match(checkoutFunction, /session\.amount_total === PRICE_CENTS/);
  assert.match(checkoutFunction, /innergid\/briefing\/\?purchase=success/);
});

test("briefing uses responsive widescreen media and clear risk language", () => {
  assert.match(css, /aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(css, /briefing-access\.has-video/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(html, /not personalized financial advice/i);
  assert.match(html, /Markets can move against any thesis/);
  assert.doesNotMatch(html, /guaranteed profit|guaranteed return/i);
});
