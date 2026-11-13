import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { LIBRARY_ITEMS } from "./library-items.mjs";
import { renderLibrary, shelvesFor } from "./library.mjs";

const SUPABASE_URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const message = document.querySelector("#library-message");
const signIn = document.querySelector("#library-sign-in");
const shelves = document.querySelector("#library-shelves");
const upgrade = document.querySelector("#library-upgrade");

const show = (text, { signInVisible = false } = {}) => {
  message.textContent = text;
  signIn.hidden = !signInVisible;
};

const loadLibrary = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const verified = sessionData?.session ? await supabase.auth.getUser() : null;
  if (!sessionData?.session || verified?.error || !verified?.data?.user) {
    shelves.replaceChildren();
    return show("Sign in with your INNERG ID to open the library.", { signInVisible: true });
  }
  let { data, error } = await supabase.functions.invoke("innerg-member-access", { method: "GET" });
  if (error || !data?.membershipNumber) {
    const { data: freeRows } = await supabase.rpc("get_free_innerg_id_record");
    if (freeRows?.[0]?.membership_number) data = { accessTier: "free" };
    else data = null;
  }
  if (!data) return show("We could not verify your INNERG ID. Please sign in again.", { signInVisible: true });
  const access = { accessTier: data.trialExpired ? "free" : data.accessTier, memberRole: data.memberRole };
  shelves.innerHTML = renderLibrary(LIBRARY_ITEMS, shelvesFor(access));
  upgrade.hidden = access.accessTier !== "free";
  show(access.accessTier === "free" ? "Your free INNERG ID opens the Everyone shelf." : "Your INNERG library is open.");
};

loadLibrary().catch(() => show("We could not load the library. Please try again.", { signInVisible: true }));
