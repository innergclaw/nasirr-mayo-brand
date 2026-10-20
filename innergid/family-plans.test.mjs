import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FAMILY_PLANS, renderFamilyPlans } from "./family-plans.mjs";
const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

test("three family tiers come from one config", () => {
  assert.deepEqual(FAMILY_PLANS.map(p => p.id), ["child", "parent", "family"]);
  assert.match(html, /id="family-plan-cards"/);
  assert.match(html, /family-plans\.mjs/);
});
test("unset prices show coming soon and a contact link, never a made-up price", () => {
  const out = renderFamilyPlans();
  assert.equal((out.match(/pricing coming soon/g) || []).length, 3);
  assert.match(out, /mailto:ownyourwebsmm@gmail\.com/);
  assert.doesNotMatch(out, /\$\d/);
});
test("a filled tier renders its price and checkout link", () => {
  const out = renderFamilyPlans([{ id: "child", name: "Child membership", audience: "x", price: "$9", checkoutUrl: "https://example.com" }]);
  assert.match(out, /\$9/);
  assert.match(out, /href="https:\/\/example\.com"/);
});
