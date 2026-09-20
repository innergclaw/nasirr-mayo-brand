import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@22.6.1";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const allowedOrigins = new Set([
  "https://nasirr.innergintel.org",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const PRODUCT_KEY = "end_of_year_frequency_2026";
const PRICE_CENTS = 1900;
const accessUrl = "https://nasirr.innergintel.org/innergid/briefing/?purchase=success#watch";

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://nasirr.innergintel.org",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) return Response.json({ error: "Sign in before purchasing the briefing." }, { status: 401, headers: corsHeaders });

  const service = createClient(url, serviceKey);
  const { data: membership, error: membershipError } = await service
    .from("innerg_memberships")
    .select("status,access_source,payment_verified,access_expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) return Response.json({ error: "Access could not be verified." }, { status: 503, headers: corsHeaders });
  const memberAccess = membership?.status === "active" && (
    membership.access_source === "grandfathered" ||
    (membership.access_source === "sunday_free" && Date.parse(membership.access_expires_at) > Date.now()) ||
    (membership.access_source === "stripe" && membership.payment_verified === true &&
      (!membership.access_expires_at || Date.parse(membership.access_expires_at) > Date.now()))
  );
  if (memberAccess) {
    return Response.json({ alreadyOwned: true, returnUrl: "https://nasirr.innergintel.org/innerg-id/#media-hub" }, { headers: corsHeaders });
  }

  const { data: existing, error: accessError } = await service
    .from("innerg_video_access")
    .select("status")
    .eq("user_id", user.id)
    .eq("product_key", PRODUCT_KEY)
    .maybeSingle();
  if (accessError) return Response.json({ error: "Purchase access could not be verified." }, { status: 503, headers: corsHeaders });
  if (existing?.status === "active") {
    return Response.json({ alreadyOwned: true, returnUrl: accessUrl }, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!stripeKey) return Response.json({ error: "Briefing checkout is not available right now." }, { status: 503, headers: corsHeaders });

  try {
    const stripe = new Stripe(stripeKey);
    for (let turn = 0; turn < 3; turn += 1) {
      const { error: reserveError } = await service.from("innerg_video_checkout_attempts").upsert({
        user_id: user.id,
        product_key: PRODUCT_KEY,
        amount_cents: PRICE_CENTS,
      }, { onConflict: "user_id", ignoreDuplicates: true });
      if (reserveError) throw reserveError;
      const { data: attempt, error: readError } = await service.from("innerg_video_checkout_attempts")
        .select("*").eq("user_id", user.id).single();
      if (readError) throw readError;
      let session = attempt.stripe_session_id ? await stripe.checkout.sessions.retrieve(attempt.stripe_session_id) : null;
      if (session?.status === "complete") return Response.json({ url: accessUrl }, { headers: corsHeaders });
      if (session?.status === "open" && session.amount_total === PRICE_CENTS) {
        return Response.json({ url: session.url }, { headers: { ...corsHeaders, "Cache-Control": "private, no-store" } });
      }
      if (session) {
        if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
        const { error: removeError } = await service.from("innerg_video_checkout_attempts").delete()
          .eq("user_id", user.id).eq("attempt_id", attempt.attempt_id);
        if (removeError) throw removeError;
        continue;
      }
      if (Date.now() - Date.parse(attempt.created_at) > 23 * 3600000) {
        return Response.json({ error: "Contact ownyourwebsmm@gmail.com so we can check your earlier purchase before another checkout." }, { status: 409, headers: corsHeaders });
      }
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: PRICE_CENTS,
            product_data: {
              name: "The End-of-Year Frequency",
              description: "27-minute INNERG briefing on the 2026-2027 bull cycle, tokenization, stablecoins, AI, beginner strategy, and Nasirr's stock and ETF watchlist",
            },
          },
          quantity: 1,
        }],
        customer_email: user.email ?? undefined,
        client_reference_id: user.id,
        success_url: accessUrl,
        cancel_url: "https://nasirr.innergintel.org/innergid/briefing/#access",
        metadata: {
          product_key: PRODUCT_KEY,
          user_id: user.id,
          amount_paid_cents: String(PRICE_CENTS),
          pricing_version: "2026-09-20",
        },
      }, { idempotencyKey: "innerg-video-checkout:" + attempt.attempt_id });
      const { error: saveError } = await service.from("innerg_video_checkout_attempts")
        .update({ stripe_session_id: session.id }).eq("user_id", user.id).eq("attempt_id", attempt.attempt_id);
      if (saveError) throw saveError;
      return Response.json({ url: session.url }, { headers: { ...corsHeaders, "Cache-Control": "private, no-store" } });
    }
    return Response.json({ error: "Checkout is being updated. Please try again." }, { status: 409, headers: corsHeaders });
  } catch (error) {
    console.error("INNERG briefing checkout failed", error);
    return Response.json({ error: "Stripe could not start checkout. Please try again." }, { status: 502, headers: corsHeaders });
  }
});
