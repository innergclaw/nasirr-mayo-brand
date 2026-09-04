import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { INNERG_ID_PATH, getSafeDestination, isRecoveryCallback, shouldRedirectToDestination } from "./auth-flow.mjs";

const SUPABASE_URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const status = document.querySelector("#auth-status");
const memberCard = document.querySelector("#member-card");
const memberEmail = document.querySelector("#member-email");
const providerButtons = [...document.querySelectorAll("[data-provider]")];
const emailForm = document.querySelector("#email-form");
const codeForm = document.querySelector("#code-form");
const codeEmail = document.querySelector("#code-email");
const changeEmail = document.querySelector("#change-email");
const recoveryForm = document.querySelector("#recovery-form");
let pendingEmail = "";
let recoveryMode = isRecoveryCallback(window.location.hash);
let redirecting = false;
const destination = getSafeDestination(window.location.search);
const accountReturnUrl = `${window.location.origin}/account/?next=${encodeURIComponent(destination)}`;

const setStatus = (message, state = "") => {
  status.textContent = message;
  status.dataset.state = state;
};

const setBusy = (busy) => {
  providerButtons.forEach((button) => { button.disabled = busy; });
  emailForm.querySelector("button").disabled = busy;
  codeForm.querySelector("button[type=submit]").disabled = busy;
};

const showEmailEntry = () => {
  codeForm.hidden = true;
  emailForm.hidden = false;
  emailForm.querySelector("input").focus();
};

const showCodeEntry = (email) => {
  pendingEmail = email;
  codeEmail.textContent = email;
  emailForm.hidden = true;
  codeForm.hidden = false;
  codeForm.querySelector("input").focus();
};

const showSession = (session) => {
  const user = session?.user;
  const signedIn = Boolean(user);
  memberCard.classList.toggle("is-visible", signedIn && !recoveryMode);
  providerButtons.forEach((button) => { button.hidden = signedIn || recoveryMode; });
  emailForm.hidden = signedIn || recoveryMode || Boolean(pendingEmail);
  codeForm.hidden = signedIn || recoveryMode || !pendingEmail;
  if (recoveryMode) {
    recoveryForm.hidden = false;
    memberCard.classList.remove("is-visible");
    setStatus("Choose a new password to finish recovery.");
    return;
  }
  if (signedIn) {
    memberEmail.textContent = user.email || "Your account is ready.";
    setStatus("Your INNERG member account is active.", "success");
    if (shouldRedirectToDestination({ session, recovery: recoveryMode, currentPath: window.location.pathname, destination })) {
      redirecting = true;
      window.location.replace(destination);
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
    setBusy(true);
    setStatus("Opening secure Google sign-in...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: button.dataset.provider,
      options: { redirectTo: accountReturnUrl },
    });
    if (error) {
      setBusy(false);
      setStatus("Google sign-in could not open. Please try again or use an email code.", "error");
    }
  });
});

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = String(new FormData(emailForm).get("email") || "").trim();
  if (!email) {
    setStatus("Enter a valid email address.", "error");
    return;
  }
  setBusy(true);
  setStatus("Sending your secure sign-in code...");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: accountReturnUrl },
  });
  setBusy(false);
  if (error) {
    setStatus("We could not send the code. Check the email and try again.", "error");
    return;
  }
  showCodeEntry(email);
  setStatus("Check your email. Enter the six-digit code below.", "success");
});

codeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const token = String(new FormData(codeForm).get("token") || "").replace(/\D/g, "");
  if (!pendingEmail || token.length !== 6) {
    setStatus("Enter the six-digit code from your email.", "error");
    return;
  }
  setBusy(true);
  setStatus("Confirming your code...");
  const { data, error } = await supabase.auth.verifyOtp({ email: pendingEmail, token, type: "email" });
  if (error || !data.session) {
    setBusy(false);
    setStatus("That code is not valid or has expired. Request a new code and try again.", "error");
    return;
  }
  setStatus("Verified. Opening your INNERG ID...", "success");
  redirecting = true;
  window.location.replace(destination);
});

changeEmail.addEventListener("click", () => {
  pendingEmail = "";
  codeForm.reset();
  showEmailEntry();
  setStatus("Enter the email you want to use for your INNERG ID.");
});

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
  if (error) {
    button.disabled = false;
    setStatus("We could not update your password. Please request a new recovery email.", "error");
    return;
  }
  recoveryMode = false;
  recoveryForm.hidden = true;
  setStatus("Password updated. Opening your INNERG ID...", "success");
  redirecting = true;
  window.location.replace(destination || INNERG_ID_PATH);
});

document.querySelector("#sign-out").addEventListener("click", async () => {
  await supabase.auth.signOut();
  pendingEmail = "";
  providerButtons.forEach((button) => { button.hidden = false; button.disabled = false; });
  emailForm.reset();
  codeForm.reset();
  showEmailEntry();
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
