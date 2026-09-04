import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const js = fs.readFileSync(new URL("./auth.js", import.meta.url), "utf8");

test("dashboard presents a private INNERG ID card", () => {
  assert.match(html, /Your INNERG ID/);
  assert.match(html, /id="id-name"/);
  assert.match(html, /id="id-number"/);
  assert.match(html, /aria-label="Flip INNERG ID card"/);
});

test("dashboard loads the signed-in member record from the secured function", () => {
  assert.match(js, /functions\.invoke\("innerg-member-access", \{ method: "GET" \}\)/);
  assert.match(js, /supabase\.auth\.getUser\(\)/);
  assert.match(js, /member\.membershipNumber/);
});

test("members can complete their own first and last name", () => {
  assert.match(html, /name="firstName"/);
  assert.match(html, /name="lastName"/);
  assert.match(js, /method: "POST"/);
  assert.match(js, /body: \{ firstName, lastName \}/);
});

test("membership sign in remains inside the Home Base dashboard", () => {
  assert.match(js, /account\/\?next=%2Fdashboard%2F/);
  assert.doesNotMatch(html + js, /ownyourweb\.marketing\/portal/);
});

test("card motion has a reduced-motion fallback", () => {
  assert.match(html, /prefers-reduced-motion:reduce/);
  assert.match(html, /\.id-card\.is-flipped \.id-front\{visibility:hidden\}/);
});
