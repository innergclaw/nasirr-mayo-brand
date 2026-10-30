import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";
import { personalize, timingSafeEqual, unsubUrl, validateBody } from "./lib.ts";

const FROM = "INNERG PULSE <innergintel@gmail.com>";
const THROTTLE_MS = 1500;
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const key = Deno.env.get("PULSE_SEND_KEY") ?? "";
  if (!key || !timingSafeEqual(req.headers.get("x-pulse-key") ?? "", key)) return json({ error: "unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid JSON" }, 400); }
  const err = validateBody(body);
  if (err) return json({ error: err }, 400);
  const { subject, html_template, text, issue_id } = body;
  const dry = body.dry_run === true;

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: subs, error: qerr } = await db.from("pulse_subscribers")
    .select("id,email,unsubscribe_token")
    .eq("status", "active").eq("wants_pulse", true).not("confirmed_at", "is", null).is("unsubscribed_at", null)
    .not("unsubscribe_token", "is", null);
  if (qerr) return json({ error: "subscriber query failed" }, 500);
  const recips = subs ?? [];
  // per-recipient substitution check for all before sending anything
  try { for (const s of recips) personalize(html_template, text, s.unsubscribe_token); }
  catch (e) { return json({ error: String((e as Error).message) }, 400); }
  if (dry) return json({ issue_id, dry_run: true, recipient_count: recips.length });

  // insert-first issue claim
  const { error: claimErr } = await db.from("pulse_send_log").insert({ issue_id, recipient_count: recips.length, status: "sending", sent_at: new Date().toISOString() });
  if (claimErr) {
    if (claimErr.code !== "23505") return json({ error: "claim failed" }, 500);
    const { data: ex } = await db.from("pulse_send_log").select("status").eq("issue_id", issue_id).single();
    if (ex?.status === "complete") return json({ issue_id, sent: 0, failed: 0, skipped: recips.length, note: "already complete" });
    // 'partial' or crashed 'sending' -> resume; per-recipient claims prevent duplicates
  }

  const pass = Deno.env.get("PULSE_GMAIL_APP_PASSWORD");
  if (!pass) return json({ error: "PULSE_GMAIL_APP_PASSWORD not set" }, 500);
  const tx = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: "innergintel@gmail.com", pass } });

  let sent = 0, failed = 0, skipped = 0, first = true;
  for (const s of recips) {
    // per-recipient insert-first claim; retry only previously failed rows
    const { error: ie } = await db.from("pulse_send_recipients").insert({ issue_id, subscriber_id: s.id, status: "sending" });
    if (ie) {
      if (ie.code !== "23505") { failed++; continue; }
      const { data: re } = await db.from("pulse_send_recipients").update({ status: "sending", error: null })
        .eq("issue_id", issue_id).eq("subscriber_id", s.id).eq("status", "failed").select("subscriber_id");
      if (!re?.length) { skipped++; continue; }
    }
    if (!first) await sleep(THROTTLE_MS);
    first = false;
    const p = personalize(html_template, text, s.unsubscribe_token);
    const u = unsubUrl(s.unsubscribe_token);
    try {
      await tx.sendMail({ from: FROM, to: s.email, subject, html: p.html, text: p.text,
        headers: { "List-Unsubscribe": `<${u}>, <mailto:innergintel@gmail.com?subject=unsubscribe>` } });
      await db.from("pulse_send_recipients").update({ status: "sent", error: null }).eq("issue_id", issue_id).eq("subscriber_id", s.id);
      sent++;
    } catch (e) {
      await db.from("pulse_send_recipients").update({ status: "failed", error: String((e as Error).message).slice(0, 500) }).eq("issue_id", issue_id).eq("subscriber_id", s.id);
      failed++;
    }
  }
  await db.from("pulse_send_log").update({ status: failed ? "partial" : "complete", sent_at: new Date().toISOString(), recipient_count: recips.length }).eq("issue_id", issue_id);
  return json({ issue_id, sent, failed, skipped });
});
