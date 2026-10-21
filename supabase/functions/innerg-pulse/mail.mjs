const GMAIL_URL = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
const UNSUBSCRIBE_URL = /^https:\/\/nasirr\.innergintel\.org\/pulse\/unsubscribe\/\?token=[a-f0-9]{64}$/;

export function unsubscribeUrl(token) {
  const url = `https://nasirr.innergintel.org/pulse/unsubscribe/?token=${token}`;
  if (!UNSUBSCRIBE_URL.test(url)) throw new Error("bad unsubscribe link");
  return url;
}

export function buildCodeMessage({ code, unsubscribeUrl: link }) {
  if (!/^[0-9]{6}$/.test(code)) throw new Error("bad code");
  if (!UNSUBSCRIBE_URL.test(link)) throw new Error("bad unsubscribe link");
  const text = [
    "INNERG PULSE",
    "",
    `Your one-time code is ${code}.`,
    "",
    "Enter it on the signup page to confirm your free market updates. The code expires in 15 minutes.",
    "",
    "You will get market news recaps on US stocks and digital assets. Education only.",
    "",
    "This is news, not financial advice.",
    "",
    "Your email is only used for INNERG PULSE. Unsubscribe anytime:",
    link,
    "",
    "Nasirr G. Mayo",
    "Founder, INNERG INTEL",
  ].join("\n");
  const html = `<div style="margin:0;background:#151513;padding:32px 16px;color:#f5f5ef;font-family:Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;border:1px solid #45453f;border-radius:14px;background:#20201d">
      <div style="padding:18px 24px;border-bottom:1px solid #45453f;font-size:12px;letter-spacing:.14em;color:#caff37">INNERG PULSE</div>
      <div style="padding:28px 24px">
        <p style="margin:0 0 12px;color:#b4b4a9;font-size:14px">Your one-time code</p>
        <p style="margin:0 0 20px;font-family:ui-monospace,monospace;font-size:32px;letter-spacing:.28em;color:#caff37">${code}</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6">Enter it on the signup page to confirm your free market updates. The code expires in 15 minutes.</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6">You will get market news recaps on US stocks and digital assets. Education only.</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6">This is news, not financial advice.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#b4b4a9">Your email is only used for INNERG PULSE. <a href="${link}" style="color:#caff37">Unsubscribe anytime</a>.</p>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #45453f;color:#b4b4a9;font-size:12px;line-height:1.5">Nasirr G. Mayo<br>Founder, INNERG INTEL</div>
    </div>
  </div>`;
  return { subject: "Your INNERG PULSE code", text, html };
}

function readEnv(env, name) {
  return String(env?.[name] ?? "").trim();
}

export function parseFrom(from) {
  const named = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (named) {
    const email = named[2].trim();
    const name = named[1].replace(/^"|"$/g, "").trim() || "INNERG PULSE";
    return { name, email };
  }
  return { name: "INNERG PULSE", email: from.trim() };
}

export function mailRoute(env) {
  const gmailUrl = readEnv(env, "PULSE_GMAIL_WEBHOOK_URL");
  const gmailSecret = readEnv(env, "PULSE_GMAIL_WEBHOOK_SECRET");
  const resend = readEnv(env, "RESEND_API_KEY");
  const brevo = readEnv(env, "PULSE_BREVO_API_KEY");
  const from = readEnv(env, "PULSE_FROM_EMAIL");
  if (gmailSecret && GMAIL_URL.test(gmailUrl)) return { provider: "gmail", gmailUrl, gmailSecret };
  if (resend && from) return { provider: "resend", resend, from };
  if (brevo && from) return { provider: "brevo", brevo, from };
  return null;
}

export async function sendCodeEmail({ env, fetchImpl = fetch, email, code, token }) {
  const route = mailRoute(env);
  if (!route) throw new Error("mail is not configured");
  const link = unsubscribeUrl(token);
  const message = buildCodeMessage({ code, unsubscribeUrl: link });
  const sender = route.provider === "gmail" ? null : parseFrom(route.from);
  let response;
  if (route.provider === "gmail") {
    response = await fetchImpl(route.gmailUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: route.gmailSecret,
        messageType: "pulse_code",
        email,
        code,
        unsubscribeUrl: link,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(20000),
      redirect: "manual",
    });
  } else if (route.provider === "resend") {
    response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${route.resend}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: route.from,
        to: [email],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(20000),
    });
  } else {
    response = await fetchImpl("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": route.brevo,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: sender.name, email: sender.email },
        to: [{ email }],
        subject: message.subject,
        textContent: message.text,
        htmlContent: message.html,
      }),
      signal: AbortSignal.timeout(20000),
    });
  }
  if (response.status >= 300 && response.status < 400) throw new Error("mail redirect rejected");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) throw new Error("mail rejected");
  return { ok: true };
}
