import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PHONE, BUDGETS, DELIVERY, validateDetails, buildMessage, buildSmsHref } from "./project-intake.mjs";

const valid = { firstName: "Sam", lastName: "Rivera", service: "A new website & logo.", budget: "$250 - $500", delivery: "A Few Weeks" };
const home = await readFile(new URL("index.html", import.meta.url), "utf8");
const script = await readFile(new URL("project-intake.mjs", import.meta.url), "utf8");

test("recipient and choices match the approved intake", () => {
  assert.equal(PHONE, "+12674730397");
  assert.deepEqual(BUDGETS, ["$100-$250", "$250 - $500", "$750 - $1000"]);
  assert.deepEqual(DELIVERY, ["ASAP", "A Few Days", "A Few Weeks", "Not Sure"]);
  for (const value of [...BUDGETS, ...DELIVERY]) assert.ok(home.includes(`<option value="${value}">${value}</option>`));
});
test("all five fields are required and whitespace-only text is rejected", () => {
  for (const name of Object.keys(valid)) {
    assert.ok(validateDetails({ ...valid, [name]: "   " })[name]);
  }
  assert.deepEqual(validateDetails(valid), {});
});
test("names and service explanation enforce their character limits", () => {
  assert.ok(validateDetails({ ...valid, firstName: "x".repeat(61) }).firstName);
  assert.ok(validateDetails({ ...valid, lastName: "x".repeat(61) }).lastName);
  assert.ok(validateDetails({ ...valid, service: "x".repeat(501) }).service);
  assert.deepEqual(validateDetails({ ...valid, service: "x".repeat(500) }), {});
});
test("unapproved budget or timeframe cannot enter the prepared message", () => {
  assert.throws(() => buildMessage({ ...valid, budget: "$500 - $750" }));
  assert.throws(() => buildMessage({ ...valid, delivery: "Guaranteed tomorrow" }));
});
test("prepared message includes each detail and encodes punctuation safely", () => {
  const details = { ...valid, firstName: " Zoë ", lastName: " O'Neil ", service: "Logo & site? 50% ready.\nKeep #1 + #2." };
  const message = buildMessage(details);
  const href = buildSmsHref(message);
  assert.ok(href.startsWith("sms:+12674730397?&body="));
  assert.equal(decodeURIComponent(href.split("body=")[1]), message);
  for (const fragment of ["Name: Zoë O'Neil", details.service, details.budget, details.delivery]) assert.ok(message.includes(fragment));
  assert.ok(href.includes("%26"));
  assert.ok(href.includes("%23"));
});
test("form loads locally, avoids duplicate handlers and makes no sent claim", () => {
  assert.match(home, /type="module" src="\/project-intake\.mjs\?v=1"/);
  assert.match(home, /project-intake\.css\?v=1/);
  assert.match(script, /form\.dataset\.intakeReady === "true"/);
  assert.match(script, /event\.preventDefault\(\)/);
  assert.match(script, /navigator\.clipboard\.writeText/);
  assert.doesNotMatch(script, /fetch\(|localStorage|sessionStorage|innerHTML|successfully sent|message sent/i);
});
