import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const js = await readFile(new URL("./sunday.js", import.meta.url), "utf8");
const css = await readFile(new URL("./sunday.css", import.meta.url), "utf8");
const migration = await readFile(new URL("../../supabase/migrations/20260919170000_innerg_sunday_id_drop.sql", import.meta.url), "utf8");
const memberAccess = await readFile(new URL("../../supabase/functions/innerg-member-access/index.ts", import.meta.url), "utf8");
const watchlistAccess = await readFile(new URL("../../supabase/functions/member-watchlist/index.ts", import.meta.url), "utf8");

test("the Sunday page states the five-place verification rule", () => {
  assert.match(html, /five ids\.<br \/>every sunday\./);
  assert.match(html, /email confirmation completes the claim/);
  assert.match(html, /form alone does not reserve a spot/);
  assert.match(html, /one person\. one verified email\. one innerg id\./);
});

test("the page uses the existing secure account flow", () => {
  assert.match(js, /account\/?\?next=%2Finnergid%2Fsunday%2F/);
  assert.match(js, /claim_innerg_sunday_id/);
  assert.match(js, /get_innerg_sunday_drop_status/);
  assert.match(js, /innerg_sunday_claim_intent/);
});

test("the claim is atomic, verified, and capped at five", () => {
  assert.match(migration, /email_confirmed_at/);
  assert.match(migration, /for update/);
  assert.match(migration, /capacity integer not null default 5 check \(capacity = 5\)/);
  assert.match(migration, /user_id uuid not null unique/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /revoke all on public\.innerg_sunday_drops/);
  assert.doesNotMatch(migration, /raw_token|verification_token/);
});

test("free identity and paid access stay separate", () => {
  assert.match(memberAccess, /accessTier: fullAccess \? "member" : "free"/);
  assert.match(memberAccess, /discordUrl: fullAccess \? DISCORD_INVITE : null/);
  assert.match(memberAccess, /const signedResults = fullAccess/);
  assert.match(watchlistAccess, /access_source === "stripe"/);
  assert.doesNotMatch(watchlistAccess, /access_source === "sunday_free"/);
});

test("the page reuses INNERG media and supports reduced motion", () => {
  assert.match(html, /innerg-id-sunday-montage\.mp4/);
  assert.match(html, /innerg-member-badge\.png/);
  assert.match(css, /prefers-reduced-motion/);
});
