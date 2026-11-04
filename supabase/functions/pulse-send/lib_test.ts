import { assert, assertEquals } from "jsr:@std/assert@1";
import { logKey, readList, unsubUrl, personalize, timingSafeEqual, validateBody, validateTemplate, PLACEHOLDER } from "./lib.ts";
const real = Deno.readTextFileSync("/workspace/pulse-issues/close-2026-10-22.html");
const good = "<!DOCTYPE html><html>INNERG PULSE " + "x".repeat(3000) + `<a href="${PLACEHOLDER}">u</a></html>`;
Deno.test("real issue file passes", () => assertEquals(validateTemplate(real), null));
Deno.test("doctype case-insensitive/trimmed", () => assertEquals(validateTemplate("  \n" + good.replace("<!DOCTYPE", "<!doctype")), null));
Deno.test("no doctype", () => assert(validateTemplate(good.replace("<!DOCTYPE html>", ""))));
Deno.test("too short", () => assert(validateTemplate(`<!DOCTYPE html>INNERG PULSE ${PLACEHOLDER}`)));
Deno.test("missing brand", () => assert(validateTemplate(good.replace("INNERG PULSE", "PULSE"))));
Deno.test("other placeholder rejected", () => assert(validateTemplate(good + "{{NAME}}")));
Deno.test("missing placeholder rejected", () => assert(validateTemplate(good.replace(PLACEHOLDER, "x"))));
Deno.test("substitution", () => {
  const p = personalize(good, `unsub: ${PLACEHOLDER}`, "abc 123");
  assert(!p.html.includes("{{")); assert(p.html.includes("token=abc%20123")); assert(p.text.endsWith("token=abc%20123&list=pulse"));
});
Deno.test("empty token throws", () => { let t = false; try { personalize(good, "", ""); } catch { t = true; } assert(t); });
Deno.test("constant-time compare", () => { assert(timingSafeEqual("abc", "abc")); assert(!timingSafeEqual("abc", "abd")); assert(!timingSafeEqual("abc", "abcd")); assert(!timingSafeEqual("", "")); });
Deno.test("body validation", () => {
  assertEquals(validateBody({ subject: "s", text: "t", issue_id: "close-2026-10-22", html_template: good }), null);
  assert(validateBody({ subject: "s", text: "t", issue_id: "bad id!", html_template: good }));
  assert(validateBody({ subject: "s", text: "{{X}}", issue_id: "a", html_template: good }));
});

Deno.test("list parameter", () => {
  assertEquals(readList(undefined), "pulse");
  assertEquals(readList("ownyourweb"), "ownyourweb");
  assertEquals(readList("all"), null);
  assertEquals(readList("toString"), null);
  assert(validateBody({ subject: "s", text: "t", issue_id: "a", list: "nope", html_template: good }));
  assertEquals(validateBody({ subject: "s", text: "t", issue_id: "a", list: "wisdom", html_template: good }), null);
  assertEquals(unsubUrl("ab", "wisdom"), "https://nasirr.innergintel.org/pulse/unsubscribe/?token=ab&list=wisdom");
  assertEquals(logKey("pulse", "x"), "x");
  assertEquals(logKey("tech", "x"), "tech:x");
});
