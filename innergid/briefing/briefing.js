import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";

const SUPABASE_URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const message = document.querySelector("#access-message");
const signIn = document.querySelector("#sign-in-action");
const purchase = document.querySelector("#purchase-action");
const retry = document.querySelector("#retry-action");
const signOut = document.querySelector("#sign-out-action");
const watch = document.querySelector("#watch");
const accessPanel = document.querySelector("#access");
const video = document.querySelector("#briefing-video");
const captionTrack = document.querySelector("#briefing-captions");
const chapters = document.querySelector("#chapters");
const stamp = document.querySelector("#access-stamp");
const watchNote = document.querySelector("#watch-note");
const memberState = document.querySelector("#member-state");
let session = null;
let chapterUrls = [];
let captionBlobUrl = "";

const functionStatus = (error) => Number(error?.context?.status || error?.status || 0);
const hideActions = () => [signIn, purchase, retry, signOut].forEach((node) => { node.hidden = true; });
const setMemberState = (state) => {
  const normalized = ["free", "paid"].includes(state) ? state : "pending";
  memberState.dataset.state = normalized;
  memberState.textContent = normalized === "paid" ? "PAID MEMBER" : normalized === "free" ? "FREE MEMBER" : "PENDING";
};

const verifySession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) return null;
  const verified = await supabase.auth.getUser();
  if (!verified.error && verified.data.user) return data.session;
  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.error || !refreshed.data.session) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    return null;
  }
  const confirmed = await supabase.auth.getUser();
  if (confirmed.error || !confirmed.data.user) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    return null;
  }
  return refreshed.data.session;
};

const selectChapter = (index, autoplay = false) => {
  const selected = chapterUrls[index];
  if (!selected?.url) return;
  video.src = selected.url;
  if (captionBlobUrl) URL.revokeObjectURL(captionBlobUrl);
  captionBlobUrl = selected.captions
    ? URL.createObjectURL(new Blob([selected.captions], { type: "text/vtt" }))
    : "";
  if (captionBlobUrl) captionTrack.src = captionBlobUrl;
  else captionTrack.removeAttribute("src");
  [...chapters.children].forEach((button, buttonIndex) => button.setAttribute("aria-current", String(buttonIndex === index)));
  watchNote.textContent = `Chapter ${index + 1} of ${chapterUrls.length}. Your private link expires after one hour and refreshes when you reopen this page.`;
  if (autoplay) video.play().catch(() => { watchNote.textContent = `Chapter ${index + 1} is ready. Press play to continue.`; });
};

const renderVideo = (data) => {
  chapterUrls = (data.chapters || []).filter((chapter) => /^https:\/\//.test(chapter?.url || ""));
  if (!chapterUrls.length) throw new Error("The briefing video is not ready. Please try again.");
  chapters.replaceChildren();
  chapterUrls.forEach((_chapter, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chapter-button";
    button.textContent = `Chapter ${index + 1}`;
    button.setAttribute("aria-current", String(index === 0));
    button.addEventListener("click", () => selectChapter(index, true));
    chapters.append(button);
  });
  stamp.textContent = data.accessType === "membership" ? "Included with your membership" : "Your briefing purchase";
  watch.hidden = false;
  accessPanel.classList.add("has-video");
  selectChapter(0);
};

const loadAccess = async ({ retryingPurchase = false } = {}) => {
  hideActions();
  setMemberState("pending");
  watch.hidden = true;
  accessPanel.classList.remove("has-video");
  message.textContent = retryingPurchase ? "Confirming your purchase..." : "Checking your INNERG account...";
  session = await verifySession();
  if (!session) {
    message.textContent = "Sign in with Google or use an email code to verify your INNERG access.";
    signIn.hidden = false;
    return null;
  }
  signOut.hidden = false;
  const { data, error } = await supabase.functions.invoke("innerg-video-access", { method: "GET" });
  if (!error && data?.access) {
    setMemberState(data.memberState);
    renderVideo(data);
    message.textContent = data.memberState === "paid"
      ? "Your paid membership is active. This briefing is included."
      : data.accessType === "purchase"
        ? "Your free member account is verified. Your one-time briefing purchase is active."
        : "Your free member access is verified. This briefing is available during your trial.";
    history.replaceState({}, "", `${location.pathname}#watch`);
    return data;
  }
  if (!error && data?.purchaseRequired) {
    setMemberState(retryingPurchase ? "pending" : data.memberState);
    message.textContent = retryingPurchase
      ? "Your payment is still pending. Do not start another checkout. Check access again in a moment."
      : "Your free member account is verified. Buy this briefing for $19, or join INNERG for full member access.";
    purchase.hidden = retryingPurchase;
    retry.hidden = !retryingPurchase;
    return null;
  }
  if (functionStatus(error) === 401) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    session = null;
    message.textContent = "Your sign-in expired. Sign in with Google or use an email code to verify access again.";
    signIn.hidden = false;
    signOut.hidden = true;
    return null;
  }
  throw new Error("Your access check is pending. Please check again in a moment.");
};

purchase.addEventListener("click", async () => {
  purchase.disabled = true;
  message.textContent = "Opening secure checkout...";
  try {
    const { data, error } = await supabase.functions.invoke("innerg-video-checkout", { method: "POST", body: {} });
    if (error) {
      const detail = await error.context?.json().catch(() => null);
      throw new Error(detail?.error || "Checkout could not open.");
    }
    if (data?.alreadyOwned && data?.returnUrl) {
      location.assign(data.returnUrl);
      return;
    }
    if (!data?.url) throw new Error("Checkout is unavailable.");
    location.assign(data.url);
  } catch (error) {
    purchase.disabled = false;
    message.textContent = error.message || "Checkout could not open. Please try again.";
  }
});

retry.addEventListener("click", () => loadAccess({ retryingPurchase: true }).catch(() => {
  setMemberState("pending");
  message.textContent = "Your access check is pending. Check again in a moment. If you already paid, do not start another checkout.";
  retry.hidden = false;
}));

signOut.addEventListener("click", async () => {
  signOut.disabled = true;
  message.textContent = "Signing out...";
  const { error } = await supabase.auth.signOut();
  if (error) {
    signOut.disabled = false;
    message.textContent = "We could not sign you out. Please try again.";
    return;
  }
  location.replace("../../account/?next=%2Finnergid%2Fbriefing%2F");
});

const purchaseReturn = new URLSearchParams(location.search).get("purchase") === "success";
try {
  let access = await loadAccess({ retryingPurchase: purchaseReturn });
  if (purchaseReturn && !access && session) {
    for (let attempt = 0; attempt < 7; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      access = await loadAccess({ retryingPurchase: true });
      if (access) break;
    }
  }
} catch (error) {
  hideActions();
  setMemberState("pending");
  message.textContent = error.message || "Your access check is pending. Please check again in a moment.";
  retry.hidden = false;
  if (session) signOut.hidden = false;
}
