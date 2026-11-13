import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PLANS, familyComparison, readPendingPlan, signInUrl, PENDING_PLAN_KEY } from "./plans.mjs";
import { getSafeDestination } from "../account/auth-flow.mjs";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const js = await readFile(new URL("./membership.js", import.meta.url), "utf8");

test("page prices match the plan table", () => {
  assert.equal(PLANS.child.cents, 1900);
  assert.equal(PLANS.parent.cents, 2900);
  assert.equal(PLANS.family.cents, 39000);
  assert.match(html, /\$19<\/span><span class="ms-per">\/ month/);
  assert.match(html, /\$29<\/span><span class="ms-per">\/ month/);
  assert.match(html, /\$390<\/span><span class="ms-per">\/ year/);
  assert.match(html, /A focused pilot for teams that need a safe starting system/);
});

test("every plan has a pick button and nothing else is sold", () => {
  for (const id of Object.keys(PLANS)) assert.match(html, new RegExp(`class="mh-btn[^"]*ms-pick" type="button" data-plan="${id}"`));
  assert.equal((html.match(/ms-pick/g) || []).length, 3);
  assert.doesNotMatch(html, /\$9 \/ month|\$99 \/ year|text to sign up/i);
});

test("sign-in comes back to /membership/", () => {
  assert.equal(getSafeDestination(signInUrl().split("?")[1]), "/membership/");
});

test("pending plan only accepts known plans", () => {
  const store = (v) => ({ getItem: (k) => (k === PENDING_PLAN_KEY ? v : null) });
  assert.equal(readPendingPlan(store("family")), "family");
  assert.equal(readPendingPlan(store("monthly")), null);
  assert.equal(readPendingPlan(store("__proto__")), null);
  assert.equal(readPendingPlan(null), null);
});

test("checkout goes through the INNERG ID checkout function with the chosen plan", () => {
  assert.match(js, /functions\.invoke\("innerg-membership-checkout", \{ method: "POST", body: \{ plan: chosen \} \}\)/);
  assert.match(js, /alreadyActive/);
  assert.match(html, /prefers-reduced-motion|mh-rise/);
});
