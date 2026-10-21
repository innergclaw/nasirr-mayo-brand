import { PULSE_ENDPOINT, PULSE_PUBLISHABLE_KEY } from "./config.js";

export const COPY = {
  codeSent: "Code sent. Enter the one-time code from your email. It expires in 15 minutes.",
  invalidCode: "That code is wrong or expired. Check the latest message, or send a new code.",
  confirmed: "You're confirmed. Market news recaps will come to this email. This is news, not financial advice.",
  rateLimited: "Too many attempts. Wait a little while, then try again.",
  unavailable: "The desk could not send mail just now. Try again shortly.",
  confirmUnavailable: "The desk could not check that code just now. Try again shortly.",
  invalidEmail: "Enter a valid email address.",
  unsubscribed: "You're unsubscribed. INNERG PULSE will stop sending market updates to that email.",
  invalidToken: "This unsubscribe link is not valid. Use the latest link from an INNERG PULSE email.",
  missingToken: "This unsubscribe link is missing its token. Open the link from your INNERG PULSE email.",
  unsubscribeUnavailable: "The desk could not update that subscription just now. Try again shortly.",
};

export function interpret(action, status) {
  if (action === "subscribe") {
    if (status === "code_sent") return { view: "code", title: "Code sent", message: COPY.codeSent, tone: "ok" };
    if (status === "rate_limited") return { view: "email", title: "Get the updates", message: COPY.rateLimited, tone: "error" };
    if (status === "invalid_email") return { view: "email", title: "Get the updates", message: COPY.invalidEmail, tone: "error" };
    return { view: "email", title: "Get the updates", message: COPY.unavailable, tone: "error" };
  }
  if (action === "confirm") {
    if (status === "confirmed") return { view: "done", title: "You're confirmed", message: COPY.confirmed, tone: "ok" };
    if (status === "invalid_code") return { view: "code", title: "Code not accepted", message: COPY.invalidCode, tone: "error" };
    if (status === "rate_limited") return { view: "code", title: "Code sent", message: COPY.rateLimited, tone: "error" };
    return { view: "code", title: "Code sent", message: COPY.confirmUnavailable, tone: "error" };
  }
  if (action === "unsubscribe") {
    if (status === "unsubscribed") return { view: "done", title: "You're unsubscribed", message: COPY.unsubscribed, tone: "ok" };
    if (status === "invalid_token") return { view: "blocked", title: "Link not valid", message: COPY.invalidToken, tone: "error" };
    if (status === "rate_limited") return { view: "ready", title: "Unsubscribe", message: COPY.rateLimited, tone: "error" };
    return { view: "ready", title: "Unsubscribe", message: COPY.unsubscribeUnavailable, tone: "error" };
  }
  return { view: "email", title: "Get the updates", message: COPY.unavailable, tone: "error" };
}

export function tokenFromSearch(search) {
  const token = new URLSearchParams(search).get("token") || "";
  return /^[a-f0-9]{64}$/.test(token) ? token : "";
}

export async function postPulse(body, fetchImpl = fetch) {
  const response = await fetchImpl(PULSE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: PULSE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json().catch(() => ({}));
  return { http: response.status, status: data.status || "unavailable" };
}

function show(doc, view) {
  const email = doc.getElementById("email-form");
  const code = doc.getElementById("code-form");
  const done = doc.getElementById("done-panel");
  const ready = doc.getElementById("unsubscribe-form");
  if (email) email.hidden = view !== "email";
  if (code) code.hidden = view !== "code";
  if (done) done.hidden = view !== "done";
  if (ready) ready.hidden = view !== "ready";
}

function paint(doc, result) {
  const title = doc.getElementById("panel-title");
  const status = doc.getElementById("panel-status");
  const panel = doc.getElementById("signup-panel");
  if (title) title.textContent = result.title;
  if (status) {
    status.textContent = result.message;
    status.dataset.tone = result.tone;
  }
  show(doc, result.view);
  panel?.classList.remove("is-fresh");
  if (panel && !doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    void panel.offsetWidth;
    panel.classList.add("is-fresh");
  }
}

function setBusy(form, busy) {
  if (!form) return;
  for (const control of form.querySelectorAll("button, input")) control.disabled = busy;
}

export function boot(doc = document) {
  const page = doc.body?.dataset?.pulsePage;
  const status = doc.getElementById("panel-status");
  if (page === "signup") {
    const emailForm = doc.getElementById("email-form");
    const codeForm = doc.getElementById("code-form");
    const emailInput = doc.getElementById("email");
    const codeInput = doc.getElementById("code");
    const sentTo = doc.getElementById("sent-to");
    let pendingEmail = "";

    const subscribe = async (email) => {
      setBusy(emailForm, true);
      setBusy(codeForm, true);
      if (status) status.textContent = "Sending a one-time code.";
      try {
        const hp = emailForm.querySelector("[name=pulse_hp]")?.value || "";
        const result = await postPulse({ action: "subscribe", email, pulse_hp: hp });
        const view = interpret("subscribe", result.status);
        if (view.view === "code") {
          pendingEmail = email;
          if (sentTo) sentTo.textContent = `Sent to ${email}.`;
          if (codeInput) codeInput.value = "";
        }
        paint(doc, view);
        if (view.view === "code") codeInput?.focus();
      } catch {
        paint(doc, interpret("subscribe", "unavailable"));
      } finally {
        setBusy(emailForm, false);
        setBusy(codeForm, false);
      }
    };

    emailForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = emailInput?.value.trim() || "";
      subscribe(email);
    });

    codeForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const code = codeInput?.value.trim() || "";
      setBusy(codeForm, true);
      if (status) status.textContent = "Checking that code.";
      try {
        const result = await postPulse({ action: "confirm", email: pendingEmail, code });
        const view = interpret("confirm", result.status);
        paint(doc, view);
        if (view.tone === "error") {
          if (codeInput) codeInput.value = "";
          codeInput?.focus();
        }
      } catch {
        paint(doc, interpret("confirm", "unavailable"));
      } finally {
        setBusy(codeForm, false);
      }
    });

    doc.getElementById("resend-code")?.addEventListener("click", () => {
      if (pendingEmail) subscribe(pendingEmail);
    });
    doc.getElementById("change-email")?.addEventListener("click", () => {
      pendingEmail = "";
      paint(doc, { view: "email", title: "Get the updates", message: "", tone: "ok" });
      emailInput?.focus();
    });
    return;
  }

  if (page === "unsubscribe") {
    const token = tokenFromSearch(doc.defaultView?.location?.search || "");
    const form = doc.getElementById("unsubscribe-form");
    if (!token) {
      paint(doc, { view: "blocked", title: "Link not valid", message: COPY.missingToken, tone: "error" });
      return;
    }
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      setBusy(form, true);
      if (status) status.textContent = "Updating your subscription.";
      try {
        const result = await postPulse({ action: "unsubscribe", token });
        paint(doc, interpret("unsubscribe", result.status));
      } catch {
        paint(doc, interpret("unsubscribe", "unavailable"));
      } finally {
        setBusy(form, false);
      }
    });
  }
}

if (typeof document !== "undefined" && document.body?.dataset?.pulsePage) boot(document);
