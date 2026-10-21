import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { handlePulse } from "./handler.mjs";

const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
  auth: { persistSession: false },
});

function envGet(name: string) {
  return Deno.env.get(name) ?? "";
}

const env = {
  get PULSE_GMAIL_WEBHOOK_URL() { return envGet("PULSE_GMAIL_WEBHOOK_URL"); },
  get PULSE_GMAIL_WEBHOOK_SECRET() { return envGet("PULSE_GMAIL_WEBHOOK_SECRET"); },
  get RESEND_API_KEY() { return envGet("RESEND_API_KEY"); },
  get PULSE_BREVO_API_KEY() { return envGet("PULSE_BREVO_API_KEY"); },
  get PULSE_FROM_EMAIL() { return envGet("PULSE_FROM_EMAIL"); },
};

Deno.serve((req) => handlePulse(req, {
  env,
  fetchImpl: fetch,
  prepare: async (email: string, ip: string) => {
    const { data, error } = await db.rpc("pulse_prepare_code", { p_email: email, p_ip: ip });
    if (error) throw new Error("prepare_failed");
    return data;
  },
  clear: async (email: string) => {
    const { error } = await db.rpc("pulse_clear_code", { p_email: email });
    if (error) throw new Error("clear_failed");
  },
  confirm: async (email: string, code: string, ip: string) => {
    const { data, error } = await db.rpc("pulse_confirm_code", { p_email: email, p_code: code, p_ip: ip });
    if (error) throw new Error("confirm_failed");
    return data;
  },
  unsubscribe: async (token: string, ip: string) => {
    const { data, error } = await db.rpc("pulse_unsubscribe", { p_token: token, p_ip: ip });
    if (error) throw new Error("unsubscribe_failed");
    return data;
  },
}));
