import { mailRoute, sendCodeEmail } from "./mail.mjs";

const PRODUCTION_ORIGIN = "https://nasirr.innergintel.org";

export function normalizeEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return "";
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return "";
  return email;
}

export function clientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0].trim();
  const raw = first || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
  return raw.slice(0, 80) || "unknown";
}

function allowedOrigin(origin) {
  if (origin === PRODUCTION_ORIGIN) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return PRODUCTION_ORIGIN;
}

function corsHeaders(req) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req.headers.get("origin") || ""),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function json(req, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

function honeypotFilled(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value != null && value !== false;
}

async function readBody(req) {
  const raw = await req.text();
  if (raw.length > 4000) return { error: "invalid_request" };
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    if (params.get("List-Unsubscribe") === "One-Click") {
      const token = new URL(req.url).searchParams.get("token") || "";
      return { data: { action: "unsubscribe", token } };
    }
    return { error: "invalid_request" };
  }
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return { error: "invalid_request" };
    return { data };
  } catch {
    return { error: "invalid_request" };
  }
}

export async function handlePulse(req, deps) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { status: "invalid_request" }, 405);

  const body = await readBody(req);
  if (body.error) return json(req, { status: "invalid_request" }, 400);
  const action = String(body.data.action || "").trim();
  const ip = clientIp(req);

  try {
    if (action === "subscribe") {
      if (honeypotFilled(body.data.pulse_hp)) return json(req, { status: "code_sent" });
      const email = normalizeEmail(body.data.email);
      if (!email) return json(req, { status: "invalid_email" }, 400);
      if (!mailRoute(deps.env)) return json(req, { status: "unavailable" }, 503);
      const prepared = await deps.prepare(email, ip);
      if (prepared?.status === "rate_limited") return json(req, { status: "rate_limited" }, 429);
      if (prepared?.status === "invalid_email") return json(req, { status: "invalid_email" }, 400);
      if (prepared?.status !== "code_ready" || !prepared.code || !prepared.unsubscribe_token) {
        return json(req, { status: "unavailable" }, 503);
      }
      try {
        await sendCodeEmail({
          env: deps.env,
          fetchImpl: deps.fetchImpl,
          email,
          code: prepared.code,
          token: prepared.unsubscribe_token,
        });
      } catch {
        await deps.clear(email).catch(() => {});
        return json(req, { status: "unavailable" }, 503);
      }
      return json(req, { status: "code_sent" });
    }

    if (action === "confirm") {
      const email = String(body.data.email ?? "").trim().slice(0, 254);
      const code = String(body.data.code ?? "").trim().slice(0, 10);
      const result = await deps.confirm(email, code, ip);
      if (result?.status === "rate_limited") return json(req, { status: "rate_limited" }, 429);
      if (result?.status === "confirmed") return json(req, { status: "confirmed" });
      if (result?.status === "invalid_code") return json(req, { status: "invalid_code" });
      return json(req, { status: "unavailable" }, 503);
    }

    if (action === "unsubscribe") {
      const token = String(body.data.token ?? "").trim().slice(0, 80);
      const result = await deps.unsubscribe(token, ip);
      if (result?.status === "rate_limited") return json(req, { status: "rate_limited" }, 429);
      if (result?.status === "unsubscribed") return json(req, { status: "unsubscribed" });
      if (result?.status === "invalid_token") return json(req, { status: "invalid_token" });
      return json(req, { status: "unavailable" }, 503);
    }

    return json(req, { status: "invalid_request" }, 400);
  } catch {
    return json(req, { status: "unavailable" }, 503);
  }
}
