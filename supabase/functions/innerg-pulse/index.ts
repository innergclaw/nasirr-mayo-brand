import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { markPulseSubscriber, requestAuthOtp, revokeAuthSession, verifyAuthOtp } from "./auth.mjs";
import { handlePulse } from "./handler.mjs";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const authUrl = supabaseUrl ? `${supabaseUrl}/auth/v1` : "";

const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

Deno.serve((req) => handlePulse(req, {
  subscribeGate: async (email: string, ip: string) => {
    const { data, error } = await db.rpc("pulse_subscribe_gate", { p_email: email, p_ip: ip });
    if (error) throw new Error("subscribe_gate_failed");
    return data;
  },
  markPending: async (email: string) => {
    const { data, error } = await db.rpc("pulse_mark_pending", { p_email: email });
    if (error) throw new Error("mark_pending_failed");
    return data;
  },
  confirmGate: async (email: string, code: string, ip: string) => {
    const { data, error } = await db.rpc("pulse_confirm_gate", { p_email: email, p_code: code, p_ip: ip });
    if (error) throw new Error("confirm_gate_failed");
    return data;
  },
  activate: async (email: string, authUserId: string) => {
    const { data, error } = await db.rpc("pulse_activate", { p_email: email, p_auth_user_id: authUserId });
    if (error) throw new Error("activate_failed");
    return data;
  },
  unsubscribe: async (token: string, ip: string) => {
    const { data, error } = await db.rpc("pulse_unsubscribe", { p_token: token, p_ip: ip });
    if (error) throw new Error("unsubscribe_failed");
    return data;
  },
  requestOtp: (email: string) => requestAuthOtp({ authUrl, anonKey, fetchImpl: fetch, email }),
  verifyOtp: (email: string, code: string) => verifyAuthOtp({ authUrl, anonKey, fetchImpl: fetch, email, code }),
  markPulse: (user: { id: string, app_metadata?: Record<string, unknown> }) => markPulseSubscriber({
    authUrl,
    serviceKey,
    fetchImpl: fetch,
    user,
  }),
  revokeSession: (accessToken: string) => revokeAuthSession({ authUrl, anonKey, fetchImpl: fetch, accessToken }),
}));
