import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { DASHBOARD_PATH, isRecoveryCallback, shouldRedirectToDashboard } from "./auth-flow.mjs";

const SUPABASE_URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const status = document.querySelector("#auth-status");
const memberCard = document.querySelector("#member-card");
const memberEmail = document.querySelector("#member-email");
const providerButtons = [...document.querySelectorAll("[data-provider]")];
const emailForm = document.querySelector("#email-form");
const emailButton = document.querySelector('[data-email-action="signin"]');
const recoveryForm = document.querySelector("#recovery-form");
let recoveryMode = isRecoveryCallback(window.location.hash);
let redirecting = false;

const setStatus = (message, state = "") => {
  status.textContent = message;
  status.dataset.state = state;
};

const showSession = (session) => {
  const user = session?.user;
  const signedIn = Boolean(user);
  memberCard.classList.toggle("is-visible", signedIn);
  providerButtons.forEach((button) => { button.hidden = signedIn; });
  emailForm.hidden = signedIn;
  if (recoveryMode) {
    recoveryForm.hidden = false;
    providerButtons.forEach((button) => { button.hidden = true; });
    emailForm.hidden = true;
    memberCard.classList.remove("is-visible");
    setStatus("Choose a new password to finish recovery.");
    return;
  }
  if (signedIn) {
    memberEmail.textContent = user.email || "Your account is ready.";
    setStatus("Account access is active.", "success");
    if (shouldRedirectToDashboard({ session, recovery: recoveryMode, currentPath: window.location.pathname })) {
      redirecting = true;
      window.location.replace(DASHBOARD_PATH);
    }
  }
};

const showAuthError = () => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const error = params.get("error_description") || params.get("error");
  if (error) setStatus("This sign-in could not be completed. Please try again.", "error");
};

providerButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const provider = button.dataset.provider;
    providerButtons.forEach((item) => { item.disabled = true; });
    setStatus("Opening secure sign-in...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/account/` },
    });
    if (error) {
      providerButtons.forEach((item) => { item.disabled = false; });
      setStatus("This sign-in option is still being connected. Please try another option or check back soon.", "error");
    }
  });
});

const submitEmail = async (mode) => {
  const formData = new FormData(emailForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || password.length < 8) {
    setStatus("Enter a valid email and a password with at least 8 characters.", "error");
    return;
  }
  providerButtons.forEach((button) => { button.disabled = true; });
  emailButton.disabled = true;
  setStatus(mode === "signup" ? "Creating your account..." : "Signing you in...");
  const result = mode === "signup"
    ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/account/` } })
    : await supabase.auth.signInWithPassword({ email, password });
  if (result.error) {
    providerButtons.forEach((button) => { button.disabled = false; });
    emailButton.disabled = false;
    setStatus("We could not complete that request. Check your details and try again.", "error");
    return;
  }
  if (mode === "signup" && !result.data.session) {
    setStatus("Check your email to confirm your account, then return here to sign in.", "success");
  } else {
    setStatus("Account access is active.", "success");
  }
};

emailForm.addEventListener("submit", (event) => { event.preventDefault(); submitEmail("signup"); });
emailButton.addEventListener("click", () => submitEmail("signin"));

recoveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(recoveryForm);
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("password-confirm") || "");
  if (password.length < 8 || password !== confirmation) {
    setStatus("Use at least 8 characters and make both passwords match.", "error");
    return;
  }
  const button = recoveryForm.querySelector("button");
  button.disabled = true;
  setStatus("Updating your password...");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) { button.disabled = false; setStatus("We could not update your password. Please request a new recovery email.", "error"); return; }
  recoveryMode = false;
  recoveryForm.hidden = true;
  setStatus("Password updated. Opening your member dashboard...", "success");
  redirecting = true;
  window.location.replace(DASHBOARD_PATH);
});

document.querySelector("#sign-out").addEventListener("click", async () => {
  await supabase.auth.signOut();
  providerButtons.forEach((button) => { button.hidden = false; button.disabled = false; });
  emailForm.hidden = false;
  emailForm.reset();
  memberCard.classList.remove("is-visible");
  setStatus("You are signed out.");
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") recoveryMode = true;
  if (!redirecting) showSession(session);
});
const { data: { session } } = await supabase.auth.getSession();
if (!redirecting) showSession(session);
showAuthError();
