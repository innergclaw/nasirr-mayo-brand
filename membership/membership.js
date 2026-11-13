import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { PLANS, PENDING_PLAN_KEY, readPendingPlan, signInUrl } from "./plans.mjs";

const SUPABASE_URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const bar = document.querySelector("#ms-bar");
const barText = document.querySelector("#ms-bar-text");
const continueButton = document.querySelector("#ms-continue");
const changeButton = document.querySelector("#ms-change");
const status = document.querySelector("#ms-status");
const pickButtons = [...document.querySelectorAll(".ms-pick")];
const cards = [...document.querySelectorAll(".ms-plan")];

let session = null;
let chosen = readPendingPlan(window.sessionStorage);

const setStatus = (message, state = "") => { status.textContent = message; status.dataset.state = state; };
const escapeText = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const markPicked = () => cards.forEach((card) => card.classList.toggle("is-picked", card.dataset.plan === chosen));

const showBar = () => {
  if (!session || !chosen) { bar.hidden = true; return; }
  const plan = PLANS[chosen];
  barText.innerHTML = `Signed in as ${escapeText(session.user?.email || "you")}. <b>${escapeText(plan.label)}</b> ~ ${escapeText(plan.priceText)}.`;
  bar.hidden = false;
  markPicked();
};

const startCheckout = async () => {
  if (!chosen) return;
  continueButton.disabled = true;
  setStatus("Opening secure checkout...");
  try {
    const { data, error } = await supabase.functions.invoke("innerg-membership-checkout", { method: "POST", body: { plan: chosen } });
    if (error) {
      let message = "Checkout could not start. Please try again.";
      try { const body = await error.context?.json?.(); if (body?.error) message = body.error; } catch { /* keep default */ }
      throw new Error(message);
    }
    if (data?.alreadyActive) {
      window.sessionStorage.removeItem(PENDING_PLAN_KEY);
      setStatus("Your account already has an active plan. Opening your INNERG ID...", "success");
      window.location.assign("/innerg-id/");
      return;
    }
    if (!data?.url) throw new Error("Checkout could not start. Please try again.");
    window.sessionStorage.removeItem(PENDING_PLAN_KEY);
    window.location.assign(data.url);
  } catch (err) {
    setStatus(err.message || "Checkout could not start. Please try again.", "error");
    continueButton.disabled = false;
  }
};

pickButtons.forEach((button) => button.addEventListener("click", () => {
  chosen = button.dataset.plan;
  if (!PLANS[chosen]) return;
  window.sessionStorage.setItem(PENDING_PLAN_KEY, chosen);
  markPicked();
  if (!session) {
    setStatus("Sign in first, then you come right back here to pay.");
    window.location.assign(signInUrl());
    return;
  }
  showBar();
  setStatus("");
  bar.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  continueButton.focus({ preventScroll: true });
}));

continueButton.addEventListener("click", startCheckout);
changeButton.addEventListener("click", () => {
  window.sessionStorage.removeItem(PENDING_PLAN_KEY);
  chosen = null;
  bar.hidden = true;
  markPicked();
  document.querySelector("#plans").scrollIntoView({ behavior: "smooth", block: "start" });
});

const { data } = await supabase.auth.getSession();
session = data?.session || null;
supabase.auth.onAuthStateChange((_event, next) => { session = next; showBar(); });
showBar();
if (session && chosen) setStatus("You are signed in. Continue to checkout when ready.", "success");
