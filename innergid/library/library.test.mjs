import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LIBRARY_ITEMS } from "./library-items.mjs";
import { renderLibrary, shelvesFor, SHELVES, TYPES } from "./library.mjs";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const js = await readFile(new URL("./library.js", import.meta.url), "utf8");
const data = await readFile(new URL("./library-items.mjs", import.meta.url), "utf8");
const landing = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("every item has a title, creator, type, shelf, why note, and https link", () => {
  const ids = new Set();
  for (const item of LIBRARY_ITEMS) {
    for (const key of ["id", "title", "creator", "why", "url"]) assert.ok(item[key]?.trim(), `${item.id} ${key}`);
    assert.ok(Object.keys(TYPES).includes(item.type), item.id);
    assert.ok(SHELVES.some(s => s.id === item.shelf), item.id);
    assert.match(item.url, /^https:\/\//);
    assert.ok(!ids.has(item.id), "duplicate " + item.id);
    ids.add(item.id);
  }
});

test("every shelf has items and the Internet Archive is a free resource", () => {
  for (const s of SHELVES) assert.ok(LIBRARY_ITEMS.some(i => i.shelf === s.id), s.id);
  const ia = LIBRARY_ITEMS.find(i => i.id === "internet-archive");
  assert.equal(ia.url, "https://archive.org/");
  assert.equal(ia.shelf, "everyone");
});

test("child sees Student and Everyone, parent sees Parent and Everyone, family sees all", () => {
  assert.deepEqual(shelvesFor({ accessTier: "member", memberRole: "child" }), ["student", "everyone"]);
  assert.deepEqual(shelvesFor({ accessTier: "member", memberRole: "parent" }), ["parent", "everyone"]);
  assert.deepEqual(shelvesFor({ accessTier: "member", memberRole: "family" }), ["student", "parent", "everyone"]);
  assert.deepEqual(shelvesFor({ accessTier: "free" }), ["everyone"]);
  assert.deepEqual(shelvesFor({}), []);
});

test("rendered shelves only include allowed items and escape text", () => {
  const out = renderLibrary(LIBRARY_ITEMS, ["student", "everyone"]);
  assert.match(out, /data-shelf="student"/);
  assert.doesNotMatch(out, /data-shelf="parent"/);
  assert.doesNotMatch(out, /How to Talk So Kids/);
  assert.match(out, /Internet Archive/);
  const bad = renderLibrary([{ shelf: "everyone", type: "book", title: "<b>x</b>", creator: "c", why: "w", url: "https://example.org/" }], ["everyone"]);
  assert.doesNotMatch(bad, /<b>x/);
  assert.equal(renderLibrary([{ shelf: "everyone", type: "book", title: "t", creator: "c", why: "w", url: "javascript:alert(1)" }], ["everyone"]).includes("lib-item"), false);
});

test("library is gated by a verified INNERG ID sign-in", () => {
  assert.match(js, /getSession/);
  assert.match(js, /auth\.getUser/);
  assert.match(js, /innerg-member-access/);
  assert.match(js, /get_free_innerg_id_record/);
  assert.match(html, /account\/\?next=%2Finnergid%2Flibrary%2F/);
  assert.match(html, /name="viewport"/);
});

test("members can reach the library from INNERG ID", () => {
  assert.match(landing, /href="\.\/library\/"/);
});

test("copy uses SI, never AI, and no em dashes", () => {
  for (const text of [html, data]) {
    assert.doesNotMatch(text, /\bAI\b/);
    assert.doesNotMatch(text, /\u2014/);
  }
});
