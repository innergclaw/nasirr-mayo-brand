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

requestAnimationFrame(() => {
  requestAnimationFrame(() => document.documentElement.classList.add("motion-live"));
});

const revealItems = document.querySelectorAll(".reveal");
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
  revealItems.forEach((item) => revealObserver.observe(item));
}

const showMember = async (session, { force = false } = {}) => {
  activeSession = session ?? null;
  if (!session?.user) {
    panel.hidden = true;
    delete panel.dataset.loaded;
    delete purchase.dataset.active;
    purchase.textContent = "Activate my INNERG ID";
    number.textContent = "";
    discord.hidden = true;
    discord.removeAttribute("href");
    return null;
  }
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
  purchaseStatus.textContent = "We have not confirmed your access yet. If you already paid, do not start another purchase. Contact ownyourwebsmm@gmail.com.";
};

const planInputs = document.querySelectorAll('input[name="billing-plan"]');
const updatePlan = () => {
  const selected = document.querySelector('input[name="billing-plan"]:checked').value;
  try { sessionStorage.setItem("innerg-billing-plan", selected); } catch {}
  document.querySelector("#plan-price").textContent = selected === "yearly" ? "$100" : "$10";
  document.querySelector("#plan-period").textContent = selected === "yearly" ? " / 12 months" : " / month";
  document.querySelector("#plan-note").textContent = selected === "yearly"
    ? "One $100 payment gives you 12 months of access from payment confirmation. No automatic renewal."
    : "Monthly access renews at $10 until canceled. Both options include the same member access.";
};
try {
  if (sessionStorage.getItem("innerg-billing-plan") === "yearly") document.querySelector('input[value="yearly"]').checked = true;
} catch {}
planInputs.forEach(input => input.addEventListener("change", updatePlan));
updatePlan();

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
    const plan = document.querySelector('input[name="billing-plan"]:checked')?.value ?? "monthly";
    const { data, error } = await supabase.functions.invoke("innerg-membership-checkout", { method: "POST", body: { plan } });
    if (error) {
      const detail = await error.context?.json().catch(() => null);
      throw new Error(detail?.error || "Checkout could not open. If you already paid, do not start another purchase.");
    }
    if (data?.alreadyActive) {
      location.assign("../innerg-id/");
      return;
    }
    if (!data?.url) throw new Error("Checkout is unavailable");
    location.assign(data.url);
  } catch (error) {
    purchase.disabled = false;
    purchaseStatus.textContent = error.message || "Checkout could not open. Please try again.";
  }
});

supabase.auth.onAuthStateChange((_event, session) => {
  showMember(session).then(checkCompletedMembership);
});
const { data } = await supabase.auth.getSession();
activeSession = data.session;
await showMember(data.session);
await checkCompletedMembership();
