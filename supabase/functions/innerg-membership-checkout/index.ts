import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@22.6.1";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const allowedOrigins = new Set([
  "https://nasirr.innergintel.org",
  "https://innergclaw.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const MONTHLY_AMOUNT = 1000;
const returnUrl = "https://nasirr.innergintel.org/innerg-id/?membership=success#media-hub";

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://nasirr.innergintel.org",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) return Response.json({ error: "Sign in before activating your INNERG ID." }, { status: 401, headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const service = createClient(supabaseUrl, serviceKey);
  const { data: membership, error: membershipError } = await service
    .from("innerg_memberships")
    .select("status,access_source,access_expires_at,stripe_subscription_id,stripe_checkout_session_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) return Response.json({error:"Membership could not be verified."},{status:503,headers:corsHeaders});
  if (membership?.status === "active" && (membership.access_source === "grandfathered" || !membership.access_expires_at || Date.parse(membership.access_expires_at)>Date.now())) {
    return Response.json({ alreadyActive: true, returnUrl: "https://nasirr.innergintel.org/innerg-id/" }, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!stripeKey) return Response.json({ error: "INNERG ID checkout is not configured yet." }, { status: 503, headers: corsHeaders });
  const stripe = new Stripe(stripeKey);
  try {
    const body = await req.json().catch(()=>({}));
    const plan = body.plan ?? "monthly";
    if (!["monthly","yearly"].includes(plan)) return Response.json({error:"Choose monthly or yearly access."},{status:400,headers:corsHeaders});
    if (membership?.stripe_subscription_id && membership.status !== "canceled") return Response.json({error:"You already have a subscription. Use Manage billing on your member page or contact ownyourwebsmm@gmail.com."},{status:409,headers:corsHeaders});
    for (let turn=0;turn<3;turn++) {
      const {error: reserveError}=await service.from("innerg_checkout_attempts").upsert({user_id:user.id,plan},{onConflict:"user_id",ignoreDuplicates:true});
      if(reserveError) throw reserveError;
      const {data:attempt,error:readError}=await service.from("innerg_checkout_attempts").select("*").eq("user_id",user.id).single();
      if(readError) throw readError;
      let session=attempt.stripe_session_id ? await stripe.checkout.sessions.retrieve(attempt.stripe_session_id) : null;
      if(session?.status==="complete" && membership?.stripe_checkout_session_id!==session.id)
        return Response.json({url:returnUrl},{headers:corsHeaders});
      if(session?.status==="open" && attempt.plan===plan)
        return Response.json({url:session.url},{headers:corsHeaders});
      if(session) {
        if(session.status==="open") await stripe.checkout.sessions.expire(session.id);
        const {error:removeError}=await service.from("innerg_checkout_attempts").delete().eq("user_id",user.id).eq("attempt_id",attempt.attempt_id);
        if(removeError) throw removeError;
        continue;
      }
      // Do not risk a second charge after Stripe's idempotency retention window.
      if(Date.now()-Date.parse(attempt.created_at)>23*3600000)
        return Response.json({error:"Contact ownyourwebsmm@gmail.com so we can check your earlier checkout before another purchase."},{status:409,headers:corsHeaders});
      const yearly=attempt.plan==="yearly";
      const metadata={membership_type:"innerg_founding",billing_plan:attempt.plan,user_id:user.id,monthly_amount_cents:yearly?"0":"1000"};
      session=await stripe.checkout.sessions.create({
        mode:yearly?"payment":"subscription",
        line_items:[{price_data:{currency:"usd",unit_amount:yearly?10000:MONTHLY_AMOUNT,
          ...(yearly?{}:{recurring:{interval:"month" as const}}),
          product_data:{name:yearly?"INNERG ID · 12 months":"INNERG ID · Monthly",
          description:yearly?"12 months of INNERG ecosystem access. One payment. No automatic renewal.":"INNERG ecosystem access. $10 each month until canceled."}},quantity:1}],
        customer_email:user.email,client_reference_id:user.id,
        success_url:returnUrl,cancel_url:"https://nasirr.innergintel.org/innergid/#access",
        metadata,...(yearly?{customer_creation:"always" as const}:{subscription_data:{metadata}})
      },{idempotencyKey:"innerg-checkout:"+attempt.attempt_id});
      const {error:saveError}=await service.from("innerg_checkout_attempts").update({stripe_session_id:session.id}).eq("user_id",user.id).eq("attempt_id",attempt.attempt_id);
      if(saveError) throw saveError;
      if(attempt.plan!==plan) continue;
      return Response.json({url:session.url},{headers:{...corsHeaders,"Cache-Control":"private, no-store"}});
    }
    return Response.json({error:"Checkout is being updated. Please try again."},{status:409,headers:corsHeaders});
  } catch (error) {
    console.error("INNERG ID checkout failed", error);
    return Response.json({ error: "Stripe could not start checkout. Please try again." }, { status: 502, headers: corsHeaders });
  }
});
