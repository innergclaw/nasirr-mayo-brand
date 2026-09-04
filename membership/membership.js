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
const fullVideo = document.querySelector("#full-video");
const memberVideo = document.querySelector("#member-video");

let activeSession = null;

const showVideoAccess = (data) => {
  if (!data?.videoAccess || !data?.videoUrl || !fullVideo || !memberVideo) return false;
  memberVideo.src = data.videoUrl;
  fullVideo.hidden = false;
  purchase.textContent = "Open my full video";
  purchaseStatus.textContent = "Your $10 video purchase is active.";
  purchase.dataset.owned = "true";
  return true;
};

const showMember = async (session, { force = false } = {}) => {
  activeSession = session ?? null;
  if (!session?.user || (panel.dataset.loaded === "true" && !force)) return null;
  panel.hidden = false;
  panel.dataset.loaded = "true";
  try {
    const { data, error } = await supabase.functions.invoke("innerg-member-access", { method: "GET" });
    if (error || !data?.membershipNumber) throw error || new Error("Member record unavailable");
    number.textContent = data.membershipNumber;
    status.textContent = "Your INNERG ID is active. Your Discord access is ready.";
    discord.href = data.discordUrl;
    discord.hidden = false;
    showVideoAccess(data);
    return data;
  } catch {
    number.textContent = "INNERG ID pending";
    status.textContent = "We could not load your member number. Refresh the page or sign in again.";
    return null;
  }
};

const checkCompletedPurchase = async () => {
  if (new URLSearchParams(location.search).get("purchase") !== "success" || !activeSession) return;
  purchaseStatus.textContent = "Confirming your purchase...";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const data = await showMember(activeSession, { force: true });
    if (showVideoAccess(data)) {
      history.replaceState({}, "", `${location.pathname}#full-video`);
      fullVideo.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  purchaseStatus.textContent = "Payment received. Your access is still being prepared. Refresh this page in a moment.";
};

purchase?.addEventListener("click", async () => {
  if (purchase.dataset.owned === "true" && !fullVideo.hidden) {
    fullVideo.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (!activeSession) {
    location.assign("../account/?next=%2Fdashboard%2F");
    return;
  }
  purchase.disabled = true;
  purchaseStatus.textContent = "Opening secure checkout...";
  try {
    const { data, error } = await supabase.functions.invoke("innerg-video-checkout", { method: "POST" });
    if (error) throw error;
    if (data?.alreadyOwned) {
      await showMember(activeSession, { force: true });
      fullVideo.scrollIntoView({ behavior: "smooth", block: "start" });
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
  showMember(session).then(checkCompletedPurchase);
});
const { data } = await supabase.auth.getSession();
activeSession = data.session;
await showMember(data.session);
await checkCompletedPurchase();
