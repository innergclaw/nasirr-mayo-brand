import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { shouldRedirectToAccount } from "../account/auth-flow.mjs";

const SUPABASE_URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const status = document.querySelector("#dashboard-status");
const content = document.querySelector("#dashboard-content");
const email = document.querySelector("#member-email");
const founderOperationsLink = document.querySelector("#founder-operations-link");
const FOUNDER_ID = "75677100-97b7-4578-92c5-cf131997b580";
let redirecting = false;

const setStatus = (message, state = "") => { status.textContent = message; status.dataset.state = state; };

const render = (session) => {
  if (shouldRedirectToAccount({ session, currentPath: window.location.pathname })) {
    redirecting = true;
    window.location.replace("../account/");
    return;
  }
  if (!session?.user) return;
  content.classList.add("is-visible");
  status.classList.add("is-hidden");
  email.textContent = session.user.email ? `Signed in as ${session.user.email}.` : "Your member access is active.";
  founderOperationsLink.hidden = session.user.id !== FOUNDER_ID;
};

supabase.auth.onAuthStateChange((_event, session) => { if (!redirecting) render(session); });
const { data, error } = await supabase.auth.getSession();
if (error) setStatus("We could not verify your session. Please return to account access and try again.", "error");
else render(data.session);

document.querySelector("#sign-out").addEventListener("click", async () => {
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) { setStatus("We could not sign you out. Please try again.", "error"); return; }
  window.location.replace("../account/");
});
