import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";

const SUPABASE_URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const panel = document.querySelector("#member-panel");
const number = document.querySelector("#member-number");
const status = document.querySelector("#member-status");
const discord = document.querySelector("#discord-link");
const purchase = document.querySelector(".purchase-action");
const purchaseStatus = document.querySelector("#purchase-status");

let activeSession = null;

const showMember = async (session, { force = false } = {}) => {
  activeSession = session ?? null;
  if (!session?.user || (panel.dataset.loaded === "true" && !force)) return null;
  panel.dataset.loaded = "true";
  try {
    const { data, error } = await supabase.functions.invoke("innerg-member-access", { method: "GET" });
    if (error || !data?.membershipNumber) throw error || new Error("Member record unavailable");
    panel.hidden = false;
    number.textContent = data.membershipNumber;
    status.textContent = "Your INNERG ID is active. The ecosystem is open.";
    discord.href = data.discordUrl;
    discord.hidden = false;
    purchase.textContent = "Open my INNERG ID";
    purchase.dataset.active = "true";
    purchaseStatus.textContent = "Your INNERG ID is active.";
    return data;
  } catch {
    panel.hidden = true;
    return null;
  }
};

const checkCompletedMembership = async () => {
  if (new URLSearchParams(location.search).get("membership") !== "success" || !activeSession) return;
  purchaseStatus.textContent = "Activating your INNERG ID...";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const data = await showMember(activeSession, { force: true });
    if (data?.membershipNumber) {
      history.replaceState({}, "", `${location.pathname}#member-panel`);
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  purchaseStatus.textContent = "Payment received. Your INNERG ID is still being prepared. Refresh this page in a moment.";
};

purchase?.addEventListener("click", async () => {
  if (purchase.dataset.active === "true") {
    location.assign("../innerg-id/");
    return;
  }
  if (!activeSession) {
    location.assign("../account/?next=%2Finnergid%2F");
    return;
  }
  purchase.disabled = true;
  purchaseStatus.textContent = "Opening secure checkout...";
  try {
    const { data, error } = await supabase.functions.invoke("innerg-membership-checkout", { method: "POST" });
    if (error) throw error;
    if (data?.alreadyActive) {
      location.assign("../innerg-id/");
      return;
    }
    if (!data?.url) throw new Error("Checkout is unavailable");
    location.assign(data.url);
  } catch {
    purchase.disabled = false;
    purchaseStatus.textContent = "Checkout could not open. Please try again.";
  }
});

supabase.auth.onAuthStateChange((_event, session) => {
  showMember(session).then(checkCompletedMembership);
});
const { data } = await supabase.auth.getSession();
activeSession = data.session;
await showMember(data.session);
await checkCompletedMembership();
