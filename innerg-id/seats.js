// INNERG ID plan seats (2026-11-13): Family owners and Child-plan guardians invite people;
// invited people claim a seat from a one-time link (/innerg-id/?join=<token>).
// Backend: innergclaw/innerg-id migration 20261113120000 (RPCs below). If those RPCs are not deployed, this stays hidden.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { JOIN_KEY, readJoinToken, inviteUrl, seatHeading, seatCopy, describeSeat } from "./seats-view.mjs";

const supabase = createClient("https://zkyhhoxcrjkhywblzehr.supabase.co", "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_");
const $ = (s) => document.querySelector(s);
const panel = $("#seats");
const heading = $("#seats-title");
const copy = $("#seats-copy");
const list = $("#seats-list");
const form = $("#seats-form");
const labelInput = $("#seat-label");
const linkBox = $("#seats-link");
const linkCode = $("#seats-link-code");
const copyButton = $("#seats-copy-link");
const shareButton = $("#seats-share-link");
const status = $("#seats-status");
const banner = $("#join-banner");
const bannerText = $("#join-banner-text");

let summary = null;
let lastLink = "";

const setStatus = (msg, state = "") => { status.textContent = msg; status.dataset.state = state; };
const cleanError = (error, fallback) => (error?.message && !/^(JWT|PGRST|permission|function)/i.test(error.message) ? error.message : fallback);
const showBanner = (msg, state = "") => { bannerText.textContent = msg; banner.dataset.state = state; banner.hidden = false; };

async function claim(token) {
  showBanner("Joining the plan you were invited to...");
  const { data, error } = await supabase.rpc("claim_innerg_seat", { p_token: token });
  try { window.localStorage.removeItem(JOIN_KEY); } catch { /* storage blocked */ }
  if (error) {
    showBanner(cleanError(error, "This invite could not be used. Ask the person who sent it for a new link."), "error");
    return false;
  }
  const number = Array.isArray(data) ? data[0]?.membership_number : data?.membership_number;
  showBanner(`You're in${number ? `. Your INNERG ID is ${number}` : ""}. Opening your access...`, "success");
  window.setTimeout(() => window.location.replace("/innerg-id/"), 1600);
  return true;
}

function renderSeats(rows) {
  list.innerHTML = "";
  for (const seat of rows) {
    const view = describeSeat(seat);
    const li = document.createElement("li");
    li.className = "seat";
    li.innerHTML = `<div><div class="seat-who"></div><div class="seat-meta"></div></div><div class="seat-actions"><button class="seat-btn" type="button">Remove</button></div>`;
    li.querySelector(".seat-who").textContent = view.who;
    const meta = li.querySelector(".seat-meta");
    meta.textContent = view.meta;
    meta.classList.toggle("on", view.active);
    const remove = li.querySelector(".seat-btn");
    remove.addEventListener("click", async () => {
      if (remove.dataset.armed !== "1") { remove.dataset.armed = "1"; remove.textContent = "Tap again to remove"; return; }
      remove.disabled = true;
      const { error } = await supabase.rpc("revoke_innerg_seat", { p_seat: seat.id });
      if (error) { setStatus(cleanError(error, "That seat could not be removed. Try again."), "error"); remove.disabled = false; return; }
      setStatus(view.active ? "Seat removed. Their access has stopped." : "Invite canceled.", "success");
      await refresh();
    });
    list.appendChild(li);
  }
}

async function refresh() {
  const { data, error } = await supabase.rpc("get_innerg_plan_summary");
  if (error) { panel.hidden = true; return; }
  summary = Array.isArray(data) ? data[0] : data;
  if (!summary) { panel.hidden = true; return; }
  document.documentElement.classList.toggle("is-guardian", summary.member_role === "guardian");

  const seatLimit = Number(summary.seat_limit) || 0;
  if (summary.is_seat) {
    if (summary.seat_owner_active) { panel.hidden = true; return; }
    heading.textContent = "Your plan is paused";
    copy.textContent = "Your access comes from someone else's plan, and that plan is not active right now. Ask the plan owner, or get your own plan.";
    list.innerHTML = ""; form.hidden = true; linkBox.hidden = true;
    panel.hidden = false;
    return;
  }
  if (!seatLimit) { panel.hidden = true; return; }

  heading.textContent = seatHeading(summary);
  copy.textContent = seatCopy(summary);
  const { data: seats, error: listError } = await supabase.rpc("list_innerg_seats");
  renderSeats(listError ? [] : seats || []);
  const used = Number(summary.seats_used) || 0;
  form.hidden = !summary.plan_active || used >= seatLimit;
  panel.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button");
  button.disabled = true;
  setStatus("Making an invite link...");
  const { data, error } = await supabase.rpc("create_innerg_seat_invite", { p_label: labelInput.value.trim() || null });
  button.disabled = false;
  if (error) { setStatus(cleanError(error, "The invite link could not be made. Try again."), "error"); return; }
  const row = Array.isArray(data) ? data[0] : data;
  lastLink = inviteUrl(window.location.origin, row.invite_token);
  linkCode.textContent = lastLink;
  linkBox.hidden = false;
  shareButton.hidden = typeof navigator.share !== "function";
  labelInput.value = "";
  setStatus("Invite ready. This link works once, for one person.", "success");
  await refresh();
});

copyButton.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(lastLink); setStatus("Link copied.", "success"); }
  catch {
    const range = document.createRange(); range.selectNodeContents(linkCode);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    setStatus("Link selected. Copy it from here.");
  }
});
shareButton.addEventListener("click", async () => {
  try { await navigator.share({ title: "Join my INNERG plan", text: "Here is your invite to get your own INNERG ID:", url: lastLink }); }
  catch { /* share sheet closed */ }
});

const { data: { session } } = await supabase.auth.getSession();
if (session) {
  const token = readJoinToken(window.localStorage);
  if (!(token && await claim(token))) await refresh();
}
