import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { handlePulse, normalizeEmail } from "./handler.mjs";
import { buildCodeMessage, mailRoute, parseFrom, sendCodeEmail, unsubscribeUrl } from "./mail.mjs";

const TOKEN = "ab".repeat(32);
const CODE = "042315";
const EMAIL = "reader@example.com";

function request(body, { method = "POST", headers = {}, url = "https://zkyhhoxcrjkhywblzehr.supabase.co/functions/v1/innerg-pulse" } = {}) {
  return new Request(url, {
    method,
    headers: { origin: "https://nasirr.innergintel.org", "content-type": "application/json", ...headers },
    body: method === "GET" || method === "OPTIONS" ? undefined : body,
  });
}

function world(overrides = {}) {
  const calls = { prepare: 0, clear: 0, confirm: 0, unsubscribe: 0, fetch: 0, fetchUrl: "", fetchBody: "" };
  const deps = {
    env: {
      PULSE_GMAIL_WEBHOOK_URL: "https://script.google.com/macros/s/Abc_123-xyz/exec",
      PULSE_GMAIL_WEBHOOK_SECRET: "test-secret",
    },
    fetchImpl: async (url, options) => {
      calls.fetch += 1;
      calls.fetchUrl = url;
      calls.fetchBody = options.body;
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    },
    prepare: async () => {
      calls.prepare += 1;
      return { status: "code_ready", code: CODE, unsubscribe_token: TOKEN, email: EMAIL };
    },
    clear: async () => { calls.clear += 1; },
    confirm: async () => { calls.confirm += 1; return { status: "confirmed" }; },
    unsubscribe: async () => { calls.unsubscribe += 1; return { status: "unsubscribed" }; },
    ...overrides,
  };
  return { calls, deps: { ...deps, ...overrides } };
}

test("email normalization matches the database check", () => {
  assert.equal(normalizeEmail("  Reader@Example.com "), "reader@example.com");
  assert.equal(normalizeEmail("not-an-email"), "");
  assert.equal(normalizeEmail("a@b.c"), "");
});

test("code mail stays on the pulse desk and carries the unsubscribe link", () => {
  const link = unsubscribeUrl(TOKEN);
  const message = buildCodeMessage({ code: CODE, unsubscribeUrl: link });
  assert.equal(message.subject, "Your INNERG PULSE code");
  assert.match(message.text, new RegExp(CODE));
  assert.match(message.text, /This is news, not financial advice\./);
  assert.match(message.text, /Your email is only used for INNERG PULSE\./);
  assert.match(message.text, /US stocks and digital assets/);
  assert.match(message.html, new RegExp(link.replace(/[?]/g, "\\?")));
  assert.doesNotMatch(`${message.subject}\n${message.text}\n${message.html}`, /—|artificial intelligence|\bAI\b|ImportInfo/);
});

test("mail route rejects a non-gmail webhook and prefers a valid gmail path", () => {
  assert.equal(mailRoute({}), null);
  assert.equal(mailRoute({ PULSE_GMAIL_WEBHOOK_URL: "https://evil.example/exec", PULSE_GMAIL_WEBHOOK_SECRET: "x" }), null);
  assert.equal(mailRoute({
    PULSE_GMAIL_WEBHOOK_URL: "https://script.google.com/macros/s/Abc/exec",
    PULSE_GMAIL_WEBHOOK_SECRET: "x",
    RESEND_API_KEY: "re_test",
    PULSE_FROM_EMAIL: "INNERG PULSE <pulse@innergintel.org>",
  }).provider, "gmail");
  assert.equal(mailRoute({ RESEND_API_KEY: "re_test", PULSE_FROM_EMAIL: "pulse@innergintel.org" }).provider, "resend");
  assert.deepEqual(parseFrom("INNERG PULSE <pulse@innergintel.org>"), { name: "INNERG PULSE", email: "pulse@innergintel.org" });
});

test("honeypot and missing mail do not issue a code", async () => {
  const hp = world();
  const hpResponse = await handlePulse(request(JSON.stringify({ action: "subscribe", email: EMAIL, pulse_hp: "filled" })), hp.deps);
  assert.equal((await hpResponse.json()).status, "code_sent");
  assert.equal(hp.calls.prepare, 0);

  const unconfigured = world({ env: {} });
  const response = await handlePulse(request(JSON.stringify({ action: "subscribe", email: EMAIL, pulse_hp: "" })), unconfigured.deps);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).status, "unavailable");
  assert.equal(unconfigured.calls.prepare, 0);
});

test("a sent code is not returned to the browser", async () => {
  const { calls, deps } = world();
  const response = await handlePulse(request(JSON.stringify({ action: "subscribe", email: EMAIL, pulse_hp: "" })), deps);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(payload, { status: "code_sent" });
  assert.equal(JSON.stringify(payload).includes(CODE), false);
  assert.equal(calls.fetchUrl, "https://script.google.com/macros/s/Abc_123-xyz/exec");
  assert.match(calls.fetchBody, new RegExp(CODE));
  assert.match(calls.fetchBody, /test-secret/);
  assert.doesNotMatch(calls.fetchUrl, /test-secret/);
  assert.equal(calls.clear, 0);
});

test("a mail failure clears the code", async () => {
  const { calls, deps } = world({
    fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({ ok: false, error: "nope" }) }),
  });
  const response = await handlePulse(request(JSON.stringify({ action: "subscribe", email: EMAIL })), deps);
  assert.equal(response.status, 503);
  assert.equal(calls.clear, 1);
  assert.equal(JSON.stringify(await response.json()).includes(CODE), false);
});

test("confirm and unsubscribe keep their public states", async () => {
  const bad = world({ confirm: async () => ({ status: "invalid_code" }) });
  const invalid = await handlePulse(request(JSON.stringify({ action: "confirm", email: EMAIL, code: "000000" })), bad.deps);
  assert.equal((await invalid.json()).status, "invalid_code");

  const limited = world({ confirm: async () => ({ status: "rate_limited" }) });
  const limitedResponse = await handlePulse(request(JSON.stringify({ action: "confirm", email: EMAIL, code: CODE })), limited.deps);
  assert.equal(limitedResponse.status, 429);

  const ok = world();
  const confirmed = await handlePulse(request(JSON.stringify({ action: "confirm", email: EMAIL, code: CODE })), ok.deps);
  assert.equal((await confirmed.json()).status, "confirmed");

  const removed = await handlePulse(request(JSON.stringify({ action: "unsubscribe", token: TOKEN })), ok.deps);
  assert.equal((await removed.json()).status, "unsubscribed");

  const missing = world({ unsubscribe: async () => ({ status: "invalid_token" }) });
  const nope = await handlePulse(request(JSON.stringify({ action: "unsubscribe", token: "nope" })), missing.deps);
  assert.equal((await nope.json()).status, "invalid_token");
});

test("one-click form posts unsubscribe with the token from the query", async () => {
  let seen = "";
  const { deps } = world({
    unsubscribe: async (token) => { seen = token; return { status: "unsubscribed" }; },
  });
  const response = await handlePulse(request("List-Unsubscribe=One-Click", {
    headers: { "content-type": "application/x-www-form-urlencoded" },
    url: `https://zkyhhoxcrjkhywblzehr.supabase.co/functions/v1/innerg-pulse?token=${TOKEN}`,
  }), deps);
  assert.equal(response.status, 200);
  assert.equal(seen, TOKEN);
});

test("localhost can call the function during a desk check", async () => {
  const { deps } = world();
  const response = await handlePulse(request(JSON.stringify({ action: "subscribe", email: "bad" }), {
    headers: { origin: "http://127.0.0.1:4173" },
  }), deps);
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://127.0.0.1:4173");
});

test("the gmail script only accepts pulse code mail", async () => {
  const source = await readFile(new URL("../../../automation/pulse-email/Code.gs", import.meta.url), "utf8");
  assert.match(source, /messageType !== 'pulse_code'/);
  assert.match(source, /This is news, not financial advice\./);
  assert.match(source, /Your email is only used for INNERG PULSE\./);
  assert.doesNotMatch(source, /member_welcome|trial_day_|—|artificial intelligence|\bAI\b|ImportInfo/);
});

test("sendCodeEmail refuses a redirect", async () => {
  await assert.rejects(() => sendCodeEmail({
    env: { RESEND_API_KEY: "re_test", PULSE_FROM_EMAIL: "pulse@innergintel.org" },
    fetchImpl: async () => ({ ok: false, status: 302, json: async () => ({}) }),
    email: EMAIL,
    code: CODE,
    token: TOKEN,
  }));
});
