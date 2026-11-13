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
  for (const t of ["$19 / month", "$29 / month", "$390 / year, up to 4 members"]) assert.ok(out.includes(t), t);
  assert.equal((out.match(/href="\/membership\/#plans"/g) || []).length, 3);
  assert.doesNotMatch(out, /Text to sign up|sms:|Ask to be notified|pricing coming soon/);
  assert.match(out, /student curriculum and lessons, built for grades 3 through 12/);
  assert.match(out, /A parent or guardian buys it and invites the child/);
  assert.match(out, /separate parent curriculum and lessons/);
  assert.match(out, /both the student curriculum and the parent curriculum, plus the parent video briefings, for up to 4 members/);
  assert.doesNotMatch(out, /same skills/);
  assert.match(out, /Renews automatically every year\./);
  assert.doesNotMatch(html, /\$9\/month|\$99\/year|To sign up, text/);
});
test("family savings math: monthly x12 vs $390", () => {
  assert.deepEqual(familySavings(1, 1), { separate: (29 + 19) * 12, save: (29 + 19) * 12 - 390 });
  assert.deepEqual(familySavings(1, 1), { separate: 576, save: 186 });
  assert.deepEqual(familySavings(2, 2), { separate: 1152, save: 762 });
  const out = renderFamilyPlans();
  assert.match(out, /A parent and child would pay \$576\/year separately\. Save \$186\./);
  assert.match(out, /2 parents \+ 2 children: \$1152\/year separately, save \$762\./);
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

test("video briefings belong to Parent and Family, never Child", () => {
  const byId = Object.fromEntries(FAMILY_PLANS.map(p => [p.id, p.audience]));
  assert.doesNotMatch(byId.child, /briefing/i);
  assert.match(byId.parent, /video briefings/);
  assert.match(byId.family, /video briefings/);
  assert.match(html, /included with Parent and Family memberships/);
});
