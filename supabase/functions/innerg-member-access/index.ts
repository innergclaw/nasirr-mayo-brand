import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const allowedOrigins = new Set([
  "https://nasirr.innergintel.org",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const DISCORD_INVITE = "https://discord.gg/3ryNWTvsX";
const VIDEO_OBJECTS = [
  "end-of-year-frequency-2026-hq-chapter-0.mp4",
  "end-of-year-frequency-2026-hq-chapter-1.mp4",
  "end-of-year-frequency-2026-hq-chapter-2.mp4",
  "end-of-year-frequency-2026-hq-chapter-3.mp4",
  "end-of-year-frequency-2026-hq-chapter-4.mp4",
  "end-of-year-frequency-2026-hq-chapter-5.mp4",
];

const cleanName = (value: unknown) => {
  if (typeof value !== "string") return null;
  const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!name || name.length > 60 || /[\u0000-\u001f\u007f]/.test(name)) return null;
  return name;
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://nasirr.innergintel.org",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) {
    return Response.json({ error: "Sign in to access your INNERG ID." }, { status: 401, headers: corsHeaders });
  }

  const service = createClient(url, serviceKey);
  const { data: membership, error: membershipError } = await service
    .from("innerg_memberships")
    .select("status,access_source,access_expires_at,billing_plan,stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    console.error("INNERG membership lookup failed", membershipError);
    return Response.json({ error: "Your membership could not be verified." }, { status: 500, headers: corsHeaders });
  }

  const membershipActive = membership?.status === "active" && (membership.access_source === "grandfathered" || !membership.access_expires_at || Date.parse(membership.access_expires_at) > Date.now());
  if (!membershipActive) {
    return Response.json({
      error: "Complete your INNERG membership to receive your ID and open the Media Hub.",
      membershipRequired: true,
    }, { status: 403, headers: { ...corsHeaders, "Cache-Control": "private, no-store" } });
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Enter your first and last name." }, { status: 400, headers: corsHeaders });
    }
    const firstName = cleanName(body.firstName);
    const lastName = cleanName(body.lastName);
    if (!firstName || !lastName) {
      return Response.json({ error: "Enter a valid first and last name." }, { status: 400, headers: corsHeaders });
    }
    const { error: updateError } = await service.rpc("update_innerg_member_name", {
      target_user_id: user.id,
      new_first_name: firstName,
      new_last_name: lastName,
    });
    if (updateError) {
      console.error("INNERG member name update failed", updateError);
      return Response.json({ error: "Your ID name could not be saved." }, { status: 500, headers: corsHeaders });
    }
  }

  const { data: rows, error } = await service.rpc("get_innerg_member_record", { target_user_id: user.id });
  const member = rows?.[0] ?? null;
  if (error) {
    console.error("INNERG member lookup failed", error);
    return Response.json({ error: "Your INNERG ID could not be loaded." }, { status: 500, headers: corsHeaders });
  }
  if (!member?.membership_number) {
    return Response.json({ error: "Your member record is still being prepared. Please try again." }, { status: 409, headers: corsHeaders });
  }

  const signedResults = await Promise.all(
    VIDEO_OBJECTS.map((path) => service.storage.from("innerg-member-video").createSignedUrl(path, 3600))
  );
  const videoChapters = signedResults
    .map(({ data, error }, index) => {
      if (error) {
        console.error("INNERG video chapter URL failed", index, error);
        return null;
      }
      return data?.signedUrl ? { chapter: index + 1, url: data.signedUrl } : null;
    })
    .filter((chapter): chapter is { chapter: number; url: string } => Boolean(chapter));
  const videoUrl = videoChapters[0]?.url ?? null;

  return Response.json({
    membershipNumber: member.membership_number,
    joinedAt: member.joined_at,
    firstName: member.first_name,
    lastName: member.last_name,
    email: user.email ?? null,
    discordUrl: DISCORD_INVITE,
    videoAccess: Boolean(videoUrl),
    videoUrl,
    videoChapters,
    membershipStatus: membership.status,
    accessSource: membership.access_source,
    billingPlan: membership.billing_plan,
    accessExpiresAt: membership.access_expires_at,
    canManageBilling: Boolean(membership.stripe_customer_id),
  }, { headers: { ...corsHeaders, "Cache-Control": "private, no-store" } });
});
