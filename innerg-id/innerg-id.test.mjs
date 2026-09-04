import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const js = await readFile(new URL("./auth.js", import.meta.url), "utf8");

test("INNERG ID route presents the named member credential", () => {
  assert.match(html, /Your place has a number/);
  assert.match(html, /id="id-name"/);
  assert.match(html, /id="id-number"/);
  assert.match(html, /firstName/);
  assert.match(html, /lastName/);
});

test("INNERG ID is guarded and loads the secured member record", () => {
  assert.match(js, /account\/\?next=%2Finnerg-id%2F/);
  assert.match(js, /functions\.invoke\("innerg-member-access", \{ method: "GET" \}\)/);
  assert.match(js, /functions\.invoke\("innerg-member-access"/);
});

test("member card contains no OwnYourWeb client portal destination", () => {
  assert.doesNotMatch(html + js, /ownyourweb\.marketing\/portal/i);
});

test("card motion respects reduced motion", () => {
  assert.match(html, /prefers-reduced-motion:reduce/);
  assert.match(js, /prefers-reduced-motion: reduce/);
});
