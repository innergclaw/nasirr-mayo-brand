import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { INNERG_ID_PATH, shouldRedirectToAccount } from "../account/auth-flow.mjs";

const SUPABASE_URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const status = document.querySelector("#id-status");
const content = document.querySelector("#id-content");
const email = document.querySelector("#member-email");
const idCard = document.querySelector("#id-card");
const idWrap = document.querySelector(".id-wrap");
const idName = document.querySelector("#id-name");
const idNumber = document.querySelector("#id-number");
const memberSince = document.querySelector("#member-since");
const nameForm = document.querySelector("#name-form");
const nameStatus = document.querySelector("#name-status");
let redirecting = false;
let loadedUserId = null;

const setStatus = (message, state = "") => {
  status.textContent = message;
  status.dataset.state = state;
};

const setMemberCard = (member) => {
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ");
  idName.textContent = fullName || "INNERG MEMBER";
  idNumber.textContent = member.membershipNumber;
  if (member.joinedAt) {
    const joined = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(member.joinedAt));
    memberSince.textContent = `Member since ${joined} · ${member.membershipNumber}`;
  }
  nameForm.hidden = Boolean(member.firstName && member.lastName);
  nameForm.elements.firstName.value = member.firstName || "";
  nameForm.elements.lastName.value = member.lastName || "";
};

const loadMemberRecord = async (session) => {
  const { data, error } = await supabase.functions.invoke("innerg-member-access", { method: "GET" });
  if (error || !data?.membershipNumber) throw error || new Error("Member record unavailable");
  setMemberCard(data);
  email.textContent = session.user.email
    ? `Verified as ${session.user.email}.`
    : "Your verified member record is active.";
};

const render = async (session) => {
  if (shouldRedirectToAccount({ session, currentPath: window.location.pathname, protectedPath: INNERG_ID_PATH })) {
    redirecting = true;
    window.location.replace("../account/?next=%2Finnerg-id%2F");
    return;
  }
  if (!session?.user || loadedUserId === session.user.id) return;
  loadedUserId = session.user.id;
  content.classList.add("is-visible");
  setStatus("Creating your INNERG ID...");
  try {
    await loadMemberRecord(session);
    status.classList.add("is-hidden");
  } catch {
    loadedUserId = null;
    setStatus("We could not load your INNERG ID. Refresh this page or sign in again.", "error");
  }
};

nameForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(nameForm);
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const button = nameForm.querySelector("button");
  if (!firstName || !lastName) {
    nameStatus.textContent = "Enter your first and last name.";
    return;
  }
  button.disabled = true;
  nameStatus.textContent = "Finishing your card...";
  const { data, error } = await supabase.functions.invoke("innerg-member-access", {
    method: "POST",
    body: { firstName, lastName },
  });
  button.disabled = false;
  if (error || !data?.membershipNumber) {
    nameStatus.textContent = "Your name could not be saved. Please try again.";
    return;
  }
  setMemberCard(data);
  nameStatus.textContent = "Your INNERG ID is complete.";
});

idCard.addEventListener("click", () => {
  const flipped = idCard.classList.toggle("is-flipped");
  idCard.setAttribute("aria-pressed", String(flipped));
});

const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
if (finePointer.matches && !reducedMotion.matches) {
  idCard.addEventListener("pointermove", (event) => {
    const bounds = idCard.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    idWrap.style.transform = `rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`;
  });
  idCard.addEventListener("pointerleave", () => { idWrap.style.transform = "rotateX(0) rotateY(0)"; });
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (!redirecting) void render(session);
});

const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
if (sessionError) {
  setStatus("We could not verify your session. Return to member access and try again.", "error");
} else if (sessionData.session) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirecting = true;
    window.location.replace("../account/?next=%2Finnerg-id%2F");
  } else {
    await render(sessionData.session);
  }
} else {
  await render(null);
}

document.querySelector("#sign-out").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    setStatus("We could not sign you out. Please try again.", "error");
    return;
  }
  window.location.replace("../account/");
});
