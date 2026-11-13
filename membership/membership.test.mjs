import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PLANS, teamComparison, readPendingPlan, signInUrl, PENDING_PLAN_KEY } from "./plans.mjs";
import { getSafeDestination } from "../account/auth-flow.mjs";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const js = await readFile(new URL("./membership.js", import.meta.url), "utf8");

test("page prices match the plan table", () => {
  assert.equal(PLANS.individual.cents, 7500);
  assert.equal(PLANS.team.cents, 35000);
  assert.match(html, /\$75\.00<\/span><span class="ms-per">\/ month/);
  assert.match(html, /\$350\.00<\/span><span class="ms-per">\/ year/);
  assert.equal(teamComparison(), 3600);
});

test("every plan has a pick button and nothing else is sold", () => {
  for (const id of Object.keys(PLANS)) assert.match(html, new RegExp(`class="mh-btn[^"]*ms-pick" type="button" data-plan="${id}"`));
  assert.equal((html.match(/ms-pick/g) || []).length, 2);
  assert.doesNotMatch(html, /\$9 \/ month|\$99 \/ year|text to sign up/i);
});

test("sign-in comes back to /membership/", () => {
  assert.equal(getSafeDestination(signInUrl().split("?")[1]), "/membership/");
});

test("pending plan only accepts known plans", () => {
  const store = (v) => ({ getItem: (k) => (k === PENDING_PLAN_KEY ? v : null) });
  assert.equal(readPendingPlan(store("team")), "team");
  assert.equal(readPendingPlan(store("monthly")), null);
  assert.equal(readPendingPlan(store("__proto__")), null);
  assert.equal(readPendingPlan(null), null);
});

test("checkout goes through the INNERG ID checkout function with the chosen plan", () => {
  assert.match(js, /functions\.invoke\("innerg-membership-checkout", \{ method: "POST", body: \{ plan: chosen \} \}\)/);
  assert.match(js, /alreadyActive/);
  assert.match(html, /prefers-reduced-motion|mh-rise/);
});
