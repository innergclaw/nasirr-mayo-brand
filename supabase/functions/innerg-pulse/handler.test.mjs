import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classifyAuthFailure, markPulseSubscriber, pulseAppMetadata, requestAuthOtp, revokeAuthSession, verifyAuthOtp } from "./auth.mjs";
import { handlePulse, normalizeEmail } from "./handler.mjs";

const TOKEN = "ab".repeat(32);
const CODE = "04231518";
const EMAIL = "reader@example.com";
const ACCESS = "access-token-value";
const USER_ID = "75677100-97b7-4578-92c5-cf131997b580";

function request(body, { method = "POST", headers = {}, url = "https://zkyhhoxcrjkhywblzehr.supabase.co/functions/v1/innerg-pulse" } = {}) {
  return new Request(url, {
    method,
    headers: { origin: "https://nasirr.innergintel.org", "content-type": "application/json", ...headers },
    body: method === "GET" || method === "OPTIONS" ? undefined : body,
  });
}

function world(overrides = {}) {
  const calls = { subscribeGate: 0, markPending: 0, confirmGate: 0, activate: 0, unsubscribe: 0, requestOtp: 0, verifyOtp: 0, markPulse: null, revoked: "" };
  const deps = {
    subscribeGate: async () => {
      calls.subscribeGate += 1;
      return { status: "ok" };
    },
    markPending: async () => {
      calls.markPending += 1;
      return { status: "pending" };
    },
    confirmGate: async () => {
      calls.confirmGate += 1;
      return { status: "ok" };
    },
    activate: async () => {
      calls.activate += 1;
      return { status: "confirmed" };
    },
    unsubscribe: async () => {
      calls.unsubscribe += 1;
      return { status: "unsubscribed" };
    },
    requestOtp: async () => {
      calls.requestOtp += 1;
      return { status: "sent" };
    },
    verifyOtp: async () => {
      calls.verifyOtp += 1;
      return {
        status: "verified",
        accessToken: ACCESS,
        user: { id: USER_ID, app_metadata: { provider: "email", providers: ["email"] } },
      };
    },
    markPulse: async (user) => {
      calls.markPulse = user;
    },
    revokeSession: async (accessToken) => {
      calls.revoked = accessToken;
    },
    ...overrides,
  };
  return { calls, deps };
}

test("email normalization matches the database check", () => {
  assert.equal(normalizeEmail("  Reader@Example.com "), "reader@example.com");
  assert.equal(normalizeEmail("not-an-email"), "");
  assert.equal(normalizeEmail("a@b.c"), "");
});

test("pulse metadata keeps existing auth claims and only adds the list flag", () => {
  const next = pulseAppMetadata({ provider: "google", providers: ["google"] });
  assert.equal(next.provider, "google");
  assert.deepEqual(next.providers, ["google"]);
  assert.equal(next.pulse_subscriber, true);
  assert.equal("role" in next, false);
});

test("auth failures map to the page states", () => {
  assert.equal(classifyAuthFailure(429, { error_code: "over_email_send_rate_limit" }), "rate_limited");
  assert.equal(classifyAuthFailure(403, { error_code: "otp_expired", msg: "Token has expired or is invalid" }), "invalid_code");
  assert.equal(classifyAuthFailure(422, { msg: "Email address not authorized" }), "unavailable");
});

test("honeypot and a failed send do not store a pending row", async () => {
  const hp = world();
  const hpResponse = await handlePulse(request(JSON.stringify({ action: "subscribe", email: EMAIL, pulse_hp: "filled" })), hp.deps);
  assert.equal((await hpResponse.json()).status, "code_sent");
  assert.equal(hp.calls.requestOtp, 0);
  assert.equal(hp.calls.markPending, 0);

  const unsent = world({ requestOtp: async () => ({ status: "unavailable" }) });
  const response = await handlePulse(request(JSON.stringify({ action: "subscribe", email: EMAIL, pulse_hp: "" })), unsent.deps);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).status, "unavailable");
  assert.equal(unsent.calls.markPending, 0);
});

test("a sent code is not returned to the browser", async () => {
  const { calls, deps } = world();
  const response = await handlePulse(request(JSON.stringify({ action: "subscribe", email: EMAIL, pulse_hp: "" })), deps);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(payload, { status: "code_sent" });
  assert.equal(JSON.stringify(payload).includes(CODE), false);
  assert.equal(calls.requestOtp, 1);
  assert.equal(calls.markPending, 1);
});

test("confirm revokes only the new session and never returns it", async () => {
  const { calls, deps } = world();
  const response = await handlePulse(request(JSON.stringify({ action: "confirm", email: EMAIL, code: CODE })), deps);
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.equal(text, JSON.stringify({ status: "confirmed" }));
  assert.equal(text.includes(ACCESS), false);
  assert.equal(calls.revoked, ACCESS);
  assert.equal(calls.activate, 1);
  assert.equal(calls.markPulse.id, USER_ID);
  assert.equal(calls.markPulse.app_metadata.provider, "email");
});

test("confirm forwards the first 8 digits", async () => {
  let seen = "";
  const { deps } = world({
    confirmGate: async (_email, code) => {
      seen = code;
      return { status: "invalid_code" };
    },
  });
  const response = await handlePulse(request(JSON.stringify({ action: "confirm", email: EMAIL, code: "12 34567890" })), deps);
  assert.equal(seen, "12345678");
  assert.equal((await response.json()).status, "invalid_code");
  assert.equal(response.status, 200);
});

test("a wrong code does not activate the list", async () => {
  const bad = world({ verifyOtp: async () => ({ status: "invalid_code" }) });
  const invalid = await handlePulse(request(JSON.stringify({ action: "confirm", email: EMAIL, code: "000000" })), bad.deps);
  assert.equal((await invalid.json()).status, "invalid_code");
  assert.equal(bad.calls.activate, 0);
  assert.equal(bad.calls.revoked, "");
});

test("confirm and unsubscribe keep their public states", async () => {
  const limited = world({ confirmGate: async () => ({ status: "rate_limited" }) });
  const limitedResponse = await handlePulse(request(JSON.stringify({ action: "confirm", email: EMAIL, code: CODE })), limited.deps);
  assert.equal(limitedResponse.status, 429);
  assert.equal(limited.calls.verifyOtp, 0);

  const removed = world();
  const gone = await handlePulse(request(JSON.stringify({ action: "unsubscribe", token: TOKEN })), removed.deps);
  assert.equal((await gone.json()).status, "unsubscribed");

  const missing = world({ unsubscribe: async () => ({ status: "invalid_token" }) });
  const nope = await handlePulse(request(JSON.stringify({ action: "unsubscribe", token: "nope" })), missing.deps);
  assert.equal((await nope.json()).status, "invalid_token");
});

test("one-click form posts unsubscribe with the token from the query", async () => {
  let seen = "";
  const { deps } = world({
    unsubscribe: async (token) => {
      seen = token;
      return { status: "unsubscribed" };
    },
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

test("auth calls use the code check, a local sign-out, and no membership write", async () => {
  const seen = [];
  const fetchImpl = async (url, options) => {
    seen.push({ url, options });
    if (String(url).endsWith("/otp")) return { ok: true, status: 200, json: async () => ({}) };
    if (String(url).endsWith("/verify")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: ACCESS,
          refresh_token: "refresh-token-value",
          user: { id: USER_ID, email: EMAIL, app_metadata: { provider: "email", providers: ["email"] } },
        }),
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };
  const auth = { authUrl: "https://example.supabase.co/auth/v1", anonKey: "anon-key", serviceKey: "service-key", fetchImpl };
  assert.equal((await requestAuthOtp({ ...auth, email: EMAIL })).status, "sent");
  const verified = await verifyAuthOtp({ ...auth, email: EMAIL, code: CODE });
  assert.equal(verified.status, "verified");
  assert.equal(await markPulseSubscriber({ ...auth, user: verified.user }), true);
  assert.equal(await revokeAuthSession({ ...auth, accessToken: verified.accessToken }), true);

  const otp = seen[0];
  assert.equal(otp.url, "https://example.supabase.co/auth/v1/otp");
  assert.equal(JSON.parse(otp.options.body).create_user, true);
  assert.equal(otp.options.headers.apikey, "anon-key");

  const verify = seen[1];
  assert.equal(JSON.parse(verify.options.body).type, "email");
  assert.equal(JSON.parse(verify.options.body).token, CODE);

  const mark = seen[2];
  assert.equal(mark.url, `https://example.supabase.co/auth/v1/admin/users/${USER_ID}`);
  assert.equal(mark.options.headers.Authorization, "Bearer service-key");
  const markBody = JSON.parse(mark.options.body);
  assert.deepEqual(Object.keys(markBody), ["app_metadata"]);
  assert.equal(markBody.app_metadata.provider, "email");
  assert.equal(markBody.app_metadata.pulse_subscriber, true);
  assert.equal("role" in markBody, false);

  const logout = seen[3];
  assert.equal(logout.url, "https://example.supabase.co/auth/v1/logout?scope=local");
  assert.equal(logout.options.headers.Authorization, `Bearer ${ACCESS}`);
  assert.equal(logout.options.headers.apikey, "anon-key");
  assert.doesNotMatch(logout.url, /scope=global/);

  const names = ["handler.mjs", "auth.mjs", "index.ts"];
  const banned = /—|artificial intelligence|\bAI\b|ImportInfo|RESEND_|PULSE_BREVO|PULSE_GMAIL|script\.google\.com|innerg_memberships/;
  for (const name of names) {
    const source = await readFile(new URL(name, import.meta.url), "utf8");
    assert.doesNotMatch(source, banned, name);
  }
});
