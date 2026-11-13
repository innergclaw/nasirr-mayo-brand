import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FAMILY_PLANS, renderFamilyPlans, familySavings } from "./family-plans.mjs";
const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

test("three family tiers come from one config", () => {
  assert.deepEqual(FAMILY_PLANS.map(p => p.id), ["individual", "team"]);
  assert.match(html, /id="family-plan-cards"/);
  assert.match(html, /family-plans\.mjs/);
});
test("set prices render and every plan checks out on /membership/", () => {
  const out = renderFamilyPlans();
  for (const t of ["$75.00 / month", "$350.00 / year, 4 to 10 people"]) assert.ok(out.includes(t), t);
  assert.equal((out.match(/href="\/membership\/#plans"/g) || []).length, 2);
  assert.doesNotMatch(out, /Text to sign up|sms:|Ask to be notified|pricing coming soon/);
  assert.match(out, /Workplace AI systems lessons and practical briefings/);
  assert.match(out, /focused workplace AI pilot/);
  assert.doesNotMatch(out, /same skills/);
  assert.match(out, /Renews automatically every year\./);
  assert.doesNotMatch(html, /\$9\/month|\$99\/year|To sign up, text/);
});
test("team reference math: individual x12 vs annual team price", () => {
  assert.deepEqual(familySavings(4), { separate: 3600, save: 3250 });
  assert.deepEqual(familySavings(10), { separate: 9000, save: 8650 });
  const out = renderFamilyPlans();
  assert.match(out, /4 individual seats would be \$3600\/year separately\. Save \$3250\./);
});
test("unset prices fall back to coming soon", () => {
  const out = renderFamilyPlans([{ id: "child", name: "Child membership", audience: "x", price: null, checkoutUrl: null }]);
  assert.match(out, /pricing coming soon/);
  assert.match(out, /mailto:ownyourwebsmm@gmail\.com/);
});
test("a filled tier renders its price and checkout link", () => {
  const out = renderFamilyPlans([{ id: "child", name: "Child membership", audience: "x", price: "$9", checkoutUrl: "https://example.com" }]);
  assert.match(out, /\$9/);
  assert.match(out, /href="https:\/\/example\.com"/);
});

test("workplace guidance appears across the current access tiers", () => {
  const byId = Object.fromEntries(FAMILY_PLANS.map(p => [p.id, p.audience]));
  assert.match(byId.individual, /Workplace AI systems/);
  assert.match(byId.team, /workplace AI pilot/);
  assert.match(html, /Individual \(\$75\.00\/month\)/);
});
