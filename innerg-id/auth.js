import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { INNERG_ID_PATH, shouldRedirectToAccount } from "../account/auth-flow.mjs";
import { ACTIVATION_DELAYS_MS, classifyMemberAccess, isCheckoutReturn } from "./access-flow.mjs";

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
const downloadCard = document.querySelector("#download-card");
const shareCard = document.querySelector("#share-card");
const shareNote = document.querySelector("#share-note");
const shareStatus = document.querySelector("#share-status");
const mediaPoster = document.querySelector("#media-poster");
const mediaVideo = document.querySelector("#media-video");
const mediaChapters = document.querySelector("#media-chapters");
const mediaStamp = document.querySelector("#media-stamp");
const mediaAction = document.querySelector("#media-action");
const mediaNote = document.querySelector("#media-note");
const activationPanel = document.querySelector("#activation-panel");
const activationEyebrow = document.querySelector("#activation-eyebrow");
const activationTitle = document.querySelector("#activation-title");
const activationCopy = document.querySelector("#activation-copy");
const activationLink = document.querySelector("#activation-link");
const activationRetry = document.querySelector("#activation-retry");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const checkoutReturn = isCheckoutReturn(window.location.search);
let redirecting = false;
let loadedUserId = null;
let currentSession = null;
let accessRequest = null;
let currentMember = null;
let chapterUrls = [];
let activeChapterIndex = 0;

const setStatus = (message, state = "") => {
  status.textContent = message;
  status.dataset.state = state;
  status.classList.remove("is-hidden");
};

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

const functionStatus = (error) => Number(error?.context?.status || error?.status || 0);

const showActivationPanel = ({ processing = false } = {}) => {
  content.classList.remove("is-visible");
  activationPanel.hidden = false;
  activationEyebrow.textContent = processing ? "Payment received" : "INNERG ID activation";
  activationTitle.textContent = processing ? "Your INNERG ID is being activated." : "Your account is ready.";
  activationCopy.textContent = processing
    ? "Stripe is finishing your member access. Check again in a moment. You will not be charged twice."
    : "Activate your $10 monthly INNERG ID to enter the member ecosystem and open the full Media Hub.";
  activationLink.hidden = processing;
  activationRetry.hidden = !processing;
  status.classList.add("is-hidden");
};

const openMediaHub = () => {
  if (checkoutReturn) history.replaceState({}, "", `${window.location.pathname}#media-hub`);
  if (window.location.hash !== "#media-hub") return;
  requestAnimationFrame(() => {
    document.querySelector("#media-hub")?.scrollIntoView({
      behavior: reducedMotion.matches ? "auto" : "smooth",
      block: "start",
    });
  });
};

const selectChapter = (index, { autoplay = false } = {}) => {
  const chapter = chapterUrls[index];
  if (!chapter) return;
  activeChapterIndex = index;
  mediaVideo.src = chapter.url;
  mediaVideo.setAttribute("aria-label", `The End-of-Year Frequency, chapter ${index + 1} of ${chapterUrls.length}`);
  mediaChapters.querySelectorAll("button").forEach((button, buttonIndex) => {
    button.setAttribute("aria-current", String(buttonIndex === index));
  });
  mediaStamp.textContent = `Chapter ${index + 1} of ${chapterUrls.length}`;
  if (autoplay) void mediaVideo.play().catch(() => {
    mediaNote.textContent = `Chapter ${index + 1} is ready. Press play to continue.`;
  });
};

const setVideoChapters = (chapters) => {
  chapterUrls = chapters.filter((chapter) => chapter?.url);
  mediaChapters.replaceChildren();
  chapterUrls.forEach((_chapter, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chapter-button";
    button.textContent = `Chapter ${index + 1}`;
    button.setAttribute("aria-current", String(index === 0));
    button.addEventListener("click", () => selectChapter(index, { autoplay: true }));
    mediaChapters.append(button);
  });
  mediaChapters.hidden = chapterUrls.length < 2;
  selectChapter(0);
};

const setMemberCard = (member) => {
  currentMember = member;
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
  const cardIsComplete = Boolean(member.firstName && member.lastName && member.membershipNumber);
  downloadCard.disabled = !cardIsComplete;
  shareCard.disabled = !cardIsComplete;
  shareNote.textContent = cardIsComplete
    ? "Save the PNG or use your device share menu for X, Instagram, Discord, and other apps."
    : "Complete your name to save or share your card.";

  if (member.videoAccess && (member.videoChapters?.length || member.videoUrl)) {
    setVideoChapters(member.videoChapters?.length ? member.videoChapters : [{ chapter: 1, url: member.videoUrl }]);
    mediaVideo.hidden = false;
    mediaPoster.hidden = true;
    if (chapterUrls.length === 1) mediaStamp.textContent = "Your access is active";
    mediaAction.textContent = "Watch now";
    mediaAction.href = "#media-video";
    mediaNote.textContent = "This full release is active on your member account.";
  } else {
    mediaVideo.removeAttribute("src");
    chapterUrls = [];
    mediaChapters.replaceChildren();
    mediaChapters.hidden = true;
    mediaVideo.hidden = true;
    mediaPoster.hidden = false;
    mediaStamp.textContent = "Member access";
    mediaAction.textContent = "Refresh access";
    mediaAction.href = "./";
    mediaNote.textContent = "This release is included with active INNERG membership.";
  }
};

mediaVideo.addEventListener("ended", () => {
  const nextChapter = activeChapterIndex + 1;
  if (nextChapter < chapterUrls.length) selectChapter(nextChapter, { autoplay: true });
});

const roundedRect = (context, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
};

const fitText = (context, text, maxWidth, startSize, minSize = 44) => {
  let size = startSize;
  while (size > minSize) {
    context.font = `800 ${size}px Inter, Arial, sans-serif`;
    if (context.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
};

const createCardBlob = async () => {
  if (!currentMember?.firstName || !currentMember?.lastName || !currentMember?.membershipNumber) {
    throw new Error("Complete your name before saving your card.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1008;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not create the card image.");

  const surface = context.createLinearGradient(0, 0, 1600, 1008);
  surface.addColorStop(0, "#fafaf6");
  surface.addColorStop(1, "#dfe4d9");
  roundedRect(context, 24, 24, 1552, 960, 72);
  context.fillStyle = surface;
  context.fill();
  context.strokeStyle = "rgba(17, 20, 17, 0.24)";
  context.lineWidth = 3;
  context.stroke();

  context.beginPath();
  context.arc(1430, 14, 420, 0, Math.PI * 2);
  context.strokeStyle = "#caff37";
  context.lineWidth = 112;
  context.stroke();

  context.beginPath();
  context.arc(150, 152, 62, 0, Math.PI * 2);
  context.strokeStyle = "#111411";
  context.lineWidth = 7;
  context.stroke();
  context.fillStyle = "#111411";
  context.font = "800 42px Inter, Arial, sans-serif";
  context.textAlign = "center";
  context.fillText("IG", 150, 168);

  context.textAlign = "right";
  context.font = "800 30px Inter, Arial, sans-serif";
  context.letterSpacing = "5px";
  context.fillText("INNERG", 1438, 136);
  context.fillText("INTEL", 1438, 178);

  const fullName = `${currentMember.firstName} ${currentMember.lastName}`.toUpperCase();
  context.textAlign = "left";
  context.fillStyle = "#111411";
  const nameSize = fitText(context, fullName, 1120, 128);
  context.font = `800 ${nameSize}px Inter, Arial, sans-serif`;
  context.fillText(fullName, 112, 725);
  context.font = "700 34px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillText(currentMember.membershipNumber, 116, 798);
  context.font = "800 24px Inter, Arial, sans-serif";
  context.fillStyle = "#596159";
  context.fillText("VERIFIED MEMBER", 116, 866);
  context.textAlign = "right";
  context.fillText("BUILD FROM THE INSIDE OUT.", 1450, 866);

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Your card image could not be created.")), "image/png", 1);
  });
};

const cardFilename = () => {
  const safeNumber = currentMember.membershipNumber.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return `innerg-id-${safeNumber}.png`;
};

const saveBlob = (blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = cardFilename();
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

downloadCard.addEventListener("click", async () => {
  shareStatus.textContent = "Preparing your card...";
  try {
    const blob = await createCardBlob();
    saveBlob(blob);
    shareStatus.textContent = "Your INNERG ID was saved as a PNG.";
  } catch (error) {
    shareStatus.textContent = error.message || "Your card could not be saved.";
  }
});

shareCard.addEventListener("click", async () => {
  shareStatus.textContent = "Preparing your share card...";
  try {
    const blob = await createCardBlob();
    const file = new File([blob], cardFilename(), { type: "image/png" });
    const shareData = {
      title: "My INNERG ID",
      text: `I am INNERG member ${currentMember.membershipNumber}.`,
      files: [file],
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
      shareStatus.textContent = "Your INNERG ID was shared.";
      return;
    }
    saveBlob(blob);
    shareStatus.textContent = "Your card was saved. Upload the PNG to your social app.";
  } catch (error) {
    if (error?.name === "AbortError") {
      shareStatus.textContent = "Sharing canceled.";
      return;
    }
    shareStatus.textContent = error.message || "Your card could not be shared.";
  }
});

mediaAction.addEventListener("click", async (event) => {
  if (mediaVideo.hidden || !mediaVideo.src) return;
  event.preventDefault();
  mediaVideo.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
  try {
    await mediaVideo.play();
  } catch {
    mediaNote.textContent = "Press play on the video to begin.";
  }
});

const loadMemberRecord = async (session) => {
  const { data, error } = await supabase.functions.invoke("innerg-member-access", { method: "GET" });
  if (error || !data?.membershipNumber) return { data: null, statusCode: functionStatus(error) };
  setMemberCard(data);
  email.textContent = session.user.email
    ? `Verified as ${session.user.email}.`
    : "Your verified member record is active.";
  return { data, statusCode: 200 };
};

const resolveMemberAccess = async (session, { force = false } = {}) => {
  currentSession = session;
  if (shouldRedirectToAccount({ session, currentPath: window.location.pathname, protectedPath: INNERG_ID_PATH })) {
    redirecting = true;
    window.location.replace("../account/?next=%2Finnerg-id%2F");
    return;
  }
  if (!session?.user || (!force && loadedUserId === session.user.id) || accessRequest) return accessRequest;

  accessRequest = (async () => {
    activationPanel.hidden = true;
    setStatus(checkoutReturn ? "Payment received. Activating your INNERG ID..." : "Checking your INNERG ID...");
    const delays = checkoutReturn ? ACTIVATION_DELAYS_MS : [0];

    for (let attempt = 0; attempt < delays.length; attempt += 1) {
      if (delays[attempt]) await wait(delays[attempt]);
      const result = await loadMemberRecord(session);
      const accessState = classifyMemberAccess({
        hasSession: true,
        membershipNumber: result.data?.membershipNumber,
        statusCode: result.statusCode,
        checkoutReturn,
        attempt,
        maxAttempts: delays.length,
      });

      if (accessState === "active") {
        loadedUserId = session.user.id;
        activationPanel.hidden = true;
        content.classList.add("is-visible");
        status.classList.add("is-hidden");
        openMediaHub();
        return result.data;
      }
      if (accessState === "retry") {
        setStatus(`Payment confirmed. Activating your INNERG ID ${attempt + 1} of ${delays.length}...`);
        continue;
      }
      if (accessState === "activate") {
        loadedUserId = session.user.id;
        showActivationPanel();
        return null;
      }
      if (accessState === "processing") {
        showActivationPanel({ processing: true });
        return null;
      }
      loadedUserId = null;
      setStatus("We could not verify your INNERG ID. Refresh this page or sign in again.", "error");
      return null;
    }
    return null;
  })().finally(() => {
    accessRequest = null;
  });

  return accessRequest;
};

activationRetry.addEventListener("click", () => {
  if (!currentSession) return;
  activationRetry.disabled = true;
  void resolveMemberAccess(currentSession, { force: true }).finally(() => {
    activationRetry.disabled = false;
  });
});

const render = async (session) => {
  try {
    await resolveMemberAccess(session);
  } catch {
    loadedUserId = null;
    setStatus("We could not verify your INNERG ID. Refresh this page or sign in again.", "error");
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
