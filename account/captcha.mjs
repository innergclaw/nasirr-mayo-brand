// CAPTCHA for /account/ sign-in, behind a flag. OFF until Mr G provides a Turnstile (or hCaptcha)
// site key AND Supabase Auth captcha is enabled with the matching secret. Site keys are public;
// the secret key lives only in Supabase Auth settings, never in this repo.
export const CAPTCHA_CONFIG = Object.freeze({
  enabled: false,
  provider: "turnstile", // "turnstile" | "hcaptcha"
  siteKey: "",           // public site key, fill in when enabling
});

const SCRIPTS = {
  turnstile: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  hcaptcha: "https://js.hcaptcha.com/1/api.js?render=explicit",
};

export const captchaActive = (config = CAPTCHA_CONFIG) =>
  Boolean(config.enabled && config.siteKey && SCRIPTS[config.provider]);

let token = "";
let widget = null;

export async function mountCaptcha(container, config = CAPTCHA_CONFIG, doc = globalThis.document) {
  if (!captchaActive(config) || !container || !doc) return false;
  await new Promise((resolve, reject) => {
    const script = doc.createElement("script");
    script.src = SCRIPTS[config.provider];
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Captcha failed to load"));
    doc.head.append(script);
  });
  const api = config.provider === "turnstile" ? globalThis.turnstile : globalThis.hcaptcha;
  container.hidden = false;
  widget = api.render(container, {
    sitekey: config.siteKey,
    callback: (value) => { token = value; },
    "expired-callback": () => { token = ""; },
  });
  return true;
}

// Returns the options fragment for supabase.auth.* calls. Empty when CAPTCHA is off.
export function captchaOptions(config = CAPTCHA_CONFIG) {
  return captchaActive(config) && token ? { captchaToken: token } : {};
}

export function captchaReady(config = CAPTCHA_CONFIG) {
  return !captchaActive(config) || Boolean(token);
}

// Tokens are single use: reset after every attempt.
export function resetCaptcha(config = CAPTCHA_CONFIG) {
  token = "";
  if (!captchaActive(config) || widget === null) return;
  const api = config.provider === "turnstile" ? globalThis.turnstile : globalThis.hcaptcha;
  api?.reset?.(widget);
}
