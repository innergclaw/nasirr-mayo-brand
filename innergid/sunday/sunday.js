import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";

const SUPABASE_URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const CLAIM_INTENT_KEY = "innerg_sunday_claim_intent";
const accountPath = "../../account/?next=%2Finnergid%2Fsunday%2F";

const remaining = document.querySelector("#remaining-count");
const dropDate = document.querySelector("#drop-date");
const action = document.querySelector("#claim-action");
const openId = document.querySelector("#open-id");
const status = document.querySelector("#claim-status");
let activeSession = null;
let claiming = false;

const formatDate = (value) => new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "America/New_York",
}).format(new Date(`${value}T12:00:00-04:00`));

const updateStatus = async () => {
  const { data, error } = await supabase.rpc("get_innerg_sunday_drop_status");
  const drop = data?.[0];
  if (error || !drop) {
    remaining.textContent = "—";
    dropDate.textContent = "weekly status is temporarily unavailable";
    return;
  }
  remaining.textContent = String(drop.remaining);
  dropDate.textContent = `${formatDate(drop.drop_date)} · opens and closes at midnight et`;
  if (drop.remaining === 0) {
    action.textContent = "this week’s five are claimed";
    action.disabled = true;
  } else if (!drop.is_open && Date.parse(drop.opens_at) > Date.now()) {
    action.textContent = "drop opens sunday";
    action.disabled = true;
    status.textContent = "the first five claims open sunday at midnight et.";
  }
};

const showResult = (claim) => {
  if (claim.claim_status === "claimed") {
    status.textContent = `confirmed. ${claim.membership_number} is yours.`;
    action.hidden = true;
    openId.hidden = false;
    remaining.textContent = String(Math.max(claim.capacity - claim.claimed_count, 0));
    return;
  }
  if (claim.claim_status === "already_has_id") {
    status.textContent = `${claim.membership_number} is already connected to this verified account.`;
    action.hidden = true;
    openId.hidden = false;
    return;
  }
  if (claim.claim_status === "full") {
    status.textContent = "this week’s five ids are claimed. the next drop opens sunday at midnight et.";
    action.textContent = "this week’s five are claimed";
    action.disabled = true;
    return;
  }
  if (claim.claim_status === "not_open") {
    status.textContent = "the first sunday drop opens september 20 at midnight et.";
    action.textContent = "drop opens sunday";
    action.disabled = true;
    return;
  }
  if (claim.claim_status === "email_unverified") {
    status.textContent = "confirm your email before a place can be assigned.";
    return;
  }
  status.textContent = "we could not complete this claim. sign in again and retry.";
};

const claim = async () => {
  if (claiming) return;
  if (!activeSession) {
    sessionStorage.setItem(CLAIM_INTENT_KEY, "1");
    location.assign(accountPath);
    return;
  }
  claiming = true;
  action.disabled = true;
  action.textContent = "checking the five places…";
  status.textContent = "verifying your account and claim order…";
  try {
    const { data, error } = await supabase.rpc("claim_innerg_sunday_id");
    if (error || !data?.[0]) throw error || new Error("No claim result");
    sessionStorage.removeItem(CLAIM_INTENT_KEY);
    showResult(data[0]);
  } catch {
    status.textContent = "the claim service is not ready. please try again in a moment.";
    action.disabled = false;
    action.textContent = "retry my claim";
  } finally {
    claiming = false;
  }
};

action.addEventListener("click", claim);
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "INITIAL_SESSION") return;
  activeSession = session;
});

await updateStatus();
const { data: { session } } = await supabase.auth.getSession();
activeSession = session;
if (activeSession && sessionStorage.getItem(CLAIM_INTENT_KEY) === "1") await claim();
