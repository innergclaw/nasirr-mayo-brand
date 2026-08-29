import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { getMemberAccessState } from "./member-access-state.mjs";

const SUPABASE_URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const memberAccess = document.querySelector("#member-access");

const renderMemberAccess = (session) => {
  if (!memberAccess) return;
  const state = getMemberAccessState(session);
  memberAccess.textContent = state.label;
  memberAccess.href = state.href;
  memberAccess.dataset.state = state.state;
  memberAccess.setAttribute("aria-label", state.ariaLabel);
};

supabase.auth.onAuthStateChange((_event, session) => renderMemberAccess(session));
const { data, error } = await supabase.auth.getSession();
renderMemberAccess(error ? null : data.session);
