// Pure helpers for seats.js (tested in innerg-id/seats.test.mjs).
export const JOIN_KEY = "innerg_join_token";
export const JOIN_TTL_MS = 7 * 24 * 3600 * 1000;
const TOKEN = /^[0-9a-f]{64}$/;

// Called from the inline head script too (kept in sync by the test): ?join=<token> is saved before sign-in redirects.
export const saveJoinToken = (storage, search, now = Date.now()) => {
  const token = new URLSearchParams(String(search || "").replace(/^\?/, "")).get("join") || "";
  if (!TOKEN.test(token)) return false;
  try { storage.setItem(JOIN_KEY, JSON.stringify({ t: token, exp: now + JOIN_TTL_MS })); return true; } catch { return false; }
};

export const readJoinToken = (storage, now = Date.now()) => {
  try {
    const saved = JSON.parse(storage?.getItem(JOIN_KEY) || "null");
    if (!saved || !TOKEN.test(saved.t) || !(saved.exp > now)) return null;
    return saved.t;
  } catch { return null; }
};

export const inviteUrl = (origin, token) => `${origin}/innerg-id/?join=${encodeURIComponent(token)}`;

export const seatHeading = (s) => (s.billing_plan === "child" ? "Your child's INNERG ID" : "Your family");

export const seatCopy = (s) => {
  const limit = Number(s.seat_limit) || 0;
  const used = Number(s.seats_used) || 0;
  const left = Math.max(0, limit - used);
  if (!s.plan_active) return "Your plan is not active right now, so seats are paused. Use Manage billing to bring it back.";
  if (s.billing_plan === "child") {
    return left ? "Make an invite link and open it on your child's device. They sign in and get their own INNERG ID and lessons." : "Your child's seat is set. Remove it to invite someone else.";
  }
  return left ? `You have ${left} of ${limit} family seats open. Each person gets their own INNERG ID.` : `All ${limit} family seats are in use. Remove one to invite someone else.`;
};

export const describeSeat = (seat) => {
  const active = seat.status === "active";
  const name = seat.first_name || seat.label || (active ? "Member" : "Invite");
  const when = new Date(active ? seat.claimed_at : seat.created_at);
  const date = Number.isNaN(when.getTime()) ? "" : when.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return {
    active,
    who: name,
    meta: active ? `Joined ${date}${seat.membership_number ? ` ~ ${seat.membership_number}` : ""}` : `Invite sent ${date} ~ waiting`,
  };
};
