import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { CAPTIONS } from "./captions.ts";

const allowedOrigins = new Set([
  "https://nasirr.innergintel.org",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const PRODUCT_KEY = "end_of_year_frequency_2026";
const VIDEO_OBJECTS = [
  "end-of-year-frequency-2026-hq-chapter-0.mp4",
  "end-of-year-frequency-2026-hq-chapter-1.mp4",
  "end-of-year-frequency-2026-hq-chapter-2.mp4",
  "end-of-year-frequency-2026-hq-chapter-3.mp4",
  "end-of-year-frequency-2026-hq-chapter-4.mp4",
  "end-of-year-frequency-2026-hq-chapter-5.mp4",
];
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://nasirr.innergintel.org",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "private, no-store",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return Response.json({ error: "Method not allowed." }, { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) return Response.json({ error: "Sign in to open this briefing." }, { status: 401, headers: corsHeaders });

  const service = createClient(url, serviceKey);
  const [{ data: membership, error: membershipError }, { data: purchase, error: purchaseError }] = await Promise.all([
    service.from("innerg_memberships")
      .select("status,access_source,payment_verified,access_expires_at")
      .eq("user_id", user.id).maybeSingle(),
    service.from("innerg_video_access")
      .select("status,amount_paid_cents,purchased_at")
      .eq("user_id", user.id).eq("product_key", PRODUCT_KEY).maybeSingle(),
  ]);
  if (membershipError || purchaseError) {
    return Response.json({ error: "Briefing access could not be verified." }, { status: 503, headers: corsHeaders });
  }
  const trialAccess = membership?.status === "active" &&
    membership.access_source === "sunday_free" &&
    Date.parse(membership.access_expires_at) > Date.now();
  const paidMember = membership?.status === "active" && (
    membership.access_source === "grandfathered" ||
    (membership.access_source === "stripe" && membership.payment_verified === true &&
      (!membership.access_expires_at || Date.parse(membership.access_expires_at) > Date.now()))
  );
  const memberAccess = paidMember || trialAccess;
  const memberState = paidMember ? "paid" : "free";
  const purchaseAccess = purchase?.status === "active" && [1000, 1900].includes(purchase.amount_paid_cents);
  if (!memberAccess && !purchaseAccess) {
    return Response.json({ access: false, memberState, purchaseRequired: true }, { headers: corsHeaders });
  }

  const signed = await Promise.all(VIDEO_OBJECTS.map((path) =>
    service.storage.from("innerg-member-video").createSignedUrl(path, 3600)
  ));
  const chapters = signed.map(({ data, error }, index) => {
    if (error || !data?.signedUrl) return null;
    return { chapter: index + 1, url: data.signedUrl, captions: CAPTIONS[index] };
  }).filter((chapter): chapter is { chapter: number; url: string; captions: string } => Boolean(chapter));
  if (!chapters.length) return Response.json({ error: "The briefing could not be opened. Please try again." }, { status: 503, headers: corsHeaders });

  return Response.json({
    access: true,
    accessType: memberAccess ? "membership" : "purchase",
    memberState,
    chapters,
    expiresInSeconds: 3600,
  }, { headers: corsHeaders });
});
