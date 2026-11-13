import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FAMILY_PLANS, renderFamilyPlans, familySavings } from "./family-plans.mjs";
const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

test("three family tiers come from one config", () => {
  assert.deepEqual(FAMILY_PLANS.map(p => p.id), ["child", "parent", "family"]);
  assert.match(html, /id="family-plan-cards"/);
  assert.match(html, /family-plans\.mjs/);
});
test("set prices render and every plan checks out on /membership/", () => {
  const out = renderFamilyPlans();
  for (const t of ["$30.00 / month", "$75.00 / month", "$250.00 / year, up to 4 members"]) assert.ok(out.includes(t), t);
  assert.equal((out.match(/href="\/membership\/#plans"/g) || []).length, 3);
  assert.doesNotMatch(out, /Text to sign up|sms:|Ask to be notified|pricing coming soon/);
  assert.match(out, /Workplace AI systems lessons and practical briefings/);
  assert.match(out, /Workplace AI guidance for a team lead or manager/);
  assert.match(out, /focused workplace AI pilot/);
  assert.doesNotMatch(out, /same skills/);
  assert.match(out, /Renews automatically every year\./);
  assert.doesNotMatch(html, /\$9\/month|\$99\/year|To sign up, text/);
});
test("organization reference math: monthly x12 vs sale price", () => {
  assert.deepEqual(familySavings(1, 1), { separate: (75 + 30) * 12, save: (75 + 30) * 12 - 250 });
  assert.deepEqual(familySavings(2, 2), { separate: 2520, save: 2270 });
  const out = renderFamilyPlans();
  assert.match(out, /Regular price \$390\.00 \/ year\. Current sale price \$250\.00 \/ year\./);
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
  assert.match(byId.child, /Workplace AI systems/);
  assert.match(byId.parent, /permissions/);
  assert.match(byId.family, /workplace AI pilot/);
  assert.match(html, /Individual \(\$30\.00\/month\)/);
});
