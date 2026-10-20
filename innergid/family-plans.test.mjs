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
test("set prices render and checkout stays on the notify button", () => {
  const out = renderFamilyPlans();
  for (const t of ["$9 / month", "$29 / month", "$99 / year, up to 4 members"]) assert.ok(out.includes(t), t);
  assert.equal((out.match(/Text to sign up/g) || []).length, 3);
  assert.equal((out.match(/\(267\) 473-0397/g) || []).length, 3);
  assert.doesNotMatch(out, /Ask to be notified/);
  for (const [msg] of [["Hi, I'm interested in the INNERG Child membership for my child."], ["Hi, I'm interested in the INNERG Parent membership."], ["Hi, we are a family interested in the INNERG Family membership."]])
    assert.ok(out.includes("sms:+12674730397?&amp;body=" + encodeURIComponent(msg).replace(/'/g, "%27").replace(/%27/g, "'")), msg);
  assert.doesNotMatch(out, /pricing coming soon/);
  assert.match(out, /student curriculum and lessons, built for grades 3 through 12/);
  assert.match(out, /separate parent curriculum and lessons/);
  assert.match(out, /both the student curriculum and the parent curriculum, plus the parent video briefings, for up to 4 members/);
  assert.doesNotMatch(out, /same skills/);
  assert.match(out, /Renews automatically every year\./);
});
test("family savings math: monthly x12 vs $99", () => {
  assert.deepEqual(familySavings(1, 1), { separate: (29 + 9) * 12, save: (29 + 9) * 12 - 99 });
  assert.deepEqual(familySavings(1, 1), { separate: 456, save: 357 });
  assert.deepEqual(familySavings(2, 2), { separate: 912, save: 813 });
  const out = renderFamilyPlans();
  assert.match(out, /A parent and child would pay \$456\/year separately\. Save \$357\./);
  assert.match(out, /2 parents \+ 2 children: \$912\/year separately, save \$813\./);
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
