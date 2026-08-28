import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";

const SUPABASE_URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const status = document.querySelector("#auth-status");
const memberCard = document.querySelector("#member-card");
const memberEmail = document.querySelector("#member-email");
const providerButtons = [...document.querySelectorAll("[data-provider]")];

const setStatus = (message, state = "") => {
  status.textContent = message;
  status.dataset.state = state;
};

const showSession = (session) => {
  const user = session?.user;
  const signedIn = Boolean(user);
  memberCard.classList.toggle("is-visible", signedIn);
  providerButtons.forEach((button) => { button.hidden = signedIn; });
  if (signedIn) {
    memberEmail.textContent = user.email || "Your account is ready.";
    setStatus("Account access is active.", "success");
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
    setStatus("Opening secure sign-in…");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/account/`, ...(provider === "azure" ? { scopes: "email" } : {}) },
    });
    if (error) {
      providerButtons.forEach((item) => { item.disabled = false; });
      setStatus("This sign-in option is still being connected. Please try another option or check back soon.", "error");
    }
  });
});

document.querySelector("#sign-out").addEventListener("click", async () => {
  await supabase.auth.signOut();
  providerButtons.forEach((button) => { button.hidden = false; button.disabled = false; });
  memberCard.classList.remove("is-visible");
  setStatus("You are signed out.");
});

supabase.auth.onAuthStateChange((_event, session) => showSession(session));
const { data: { session } } = await supabase.auth.getSession();
showSession(session);
showAuthError();
