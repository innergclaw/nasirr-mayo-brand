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
  assert.equal((migration.match(/from public\.innerg_sunday_drops as d/g) || []).length, 2);
  assert.equal((migration.match(/where d\.drop_date = v_drop_date/g) || []).length, 2);
  assert.equal((migration.match(/on conflict on constraint innerg_sunday_drops_drop_date_key do nothing/g) || []).length, 2);
  assert.match(migration, /revoke all on public\.innerg_sunday_drops/);
  assert.match(migration, /revoke all on function public\.claim_innerg_sunday_id\(\) from anon/);
  assert.match(migration, /revoke all on function public\.get_free_innerg_id_record\(\) from anon/);
  assert.match(migration, /revoke all on function public\.update_free_innerg_id_name\(text, text\) from anon/);
  assert.doesNotMatch(migration, /raw_token|verification_token/);
});

test("free identity and paid access stay separate", () => {
  assert.match(memberAccess, /accessTier: fullAccess \? "member" : "free"/);
  assert.match(memberAccess, /discordUrl: fullAccess \? DISCORD_INVITE : null/);
  assert.match(memberAccess, /const signedResults = fullAccess/);
  assert.match(watchlistAccess, /access_source === "stripe"/);
  assert.doesNotMatch(watchlistAccess, /access_source === "sunday_free"/);
});

test("the page has no video section and supports reduced motion", () => {
  assert.doesNotMatch(html, /<video|innerg-id-sunday-montage|drop-visual/);
  assert.match(html, /innerg-member-badge\.png/);
  assert.match(css, /prefers-reduced-motion/);
});
