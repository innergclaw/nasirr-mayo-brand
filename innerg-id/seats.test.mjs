import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { saveJoinToken, readJoinToken, inviteUrl, seatCopy, seatHeading, describeSeat, JOIN_KEY, JOIN_TTL_MS } from "./seats-view.mjs";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const js = await readFile(new URL("./seats.js", import.meta.url), "utf8");
const memStore = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const TOK = "a".repeat(64);

test("join tokens: only 64-hex tokens are kept, and they expire", () => {
  const s = memStore();
  assert.equal(saveJoinToken(s, "?join=nope"), false);
  assert.equal(saveJoinToken(s, `?join=${TOK}`, 1000), true);
  assert.equal(readJoinToken(s, 1000), TOK);
  assert.equal(readJoinToken(s, 1000 + JOIN_TTL_MS + 1), null);
  s.setItem(JOIN_KEY, "{bad json");
  assert.equal(readJoinToken(s), null);
});

test("inline head script saves the same key and format before any sign-in redirect", () => {
  assert.match(html, new RegExp(`localStorage\\.setItem\\("${JOIN_KEY}"`));
  assert.match(html, /\^\[0-9a-f\]\{64\}\$/);
  assert.match(html, new RegExp(`exp:Date\\.now\\(\\)\\+${JOIN_TTL_MS / 1000}e3|exp:Date\\.now\\(\\)\\+6048e5`));
  assert.ok(html.indexOf('localStorage.setItem("innerg_join_token"') < html.indexOf("./auth.js"));
});

test("invite links point at /innerg-id/ with the token", () => {
  assert.equal(inviteUrl("https://nasirr.innergintel.study", TOK), `https://nasirr.innergintel.study/innerg-id/?join=${TOK}`);
});

test("seat copy fits each plan", () => {
  assert.equal(seatHeading({ billing_plan: "child" }), "Your child's INNERG ID");
  assert.equal(seatHeading({ billing_plan: "family" }), "Your family");
  assert.match(seatCopy({ billing_plan: "family", seat_limit: 3, seats_used: 1, plan_active: true }), /2 of 3 family seats open/);
  assert.match(seatCopy({ billing_plan: "family", seat_limit: 3, seats_used: 3, plan_active: true }), /All 3 family seats are in use/);
  assert.match(seatCopy({ billing_plan: "child", seat_limit: 1, seats_used: 0, plan_active: true }), /child's device/);
  assert.match(seatCopy({ billing_plan: "family", seat_limit: 3, seats_used: 0, plan_active: false }), /not active/);
  assert.equal(describeSeat({ status: "invited", label: "Kid", created_at: "2026-11-13T12:00:00Z" }).active, false);
  assert.match(describeSeat({ status: "active", first_name: "Ava", membership_number: "INNERG-000012", claimed_at: "2026-11-13T12:00:00Z" }).meta, /INNERG-000012/);
});

test("page uses the seat RPCs and guardians do not see the plan picker", () => {
  for (const rpc of ["get_innerg_plan_summary", "list_innerg_seats", "create_innerg_seat_invite", "revoke_innerg_seat", "claim_innerg_seat"]) assert.match(js, new RegExp(`rpc\\("${rpc}"`));
  for (const id of ["seats", "seats-list", "seats-form", "seats-link", "join-banner"]) assert.match(html, new RegExp(`id="${id}"`));
  const css = html.includes("innerg-id-hub.css");
  assert.ok(css);
});
