import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sendGmail } from "./gmail.ts";
import { paidPlan, yearAfter } from "./membership-rules.ts";
import Stripe from "npm:stripe@22.6.1";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.112.4";

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const expectedPaymentLinkId = Deno.env.get("STRIPE_PAYMENT_LINK_ID") ?? "";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VIDEO_PRODUCT = "end_of_year_frequency_2026";

const text = (value: unknown) => typeof value === "string" ? value : value && typeof value === "object" && "id" in value ? String(value.id) : null;
async function sendMemberEmail(service: SupabaseClient, userId: string, membershipNumber: string) {
  const { data: { user }, error: userError } = await service.auth.admin.getUserById(userId);
  if (userError || !user?.email) throw new Error("Member email is not available");
  const {data:records,error:recordError}=await service.rpc("get_innerg_member_record",{target_user_id:userId});
  const card=records?.[0];
  if(recordError || !card?.membership_number) throw new Error("Member card is not ready");
  await sendGmail({ email: user.email, memberId: card.membership_number, firstName: card.first_name || "member" });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!stripeKey || !webhookSecret) return new Response("Stripe is not configured", { status: 503 });
  const stripe = new Stripe(stripeKey);
  const signature = req.headers.get("stripe-signature") ?? "";
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const service = createClient(url, serviceKey);

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id ?? "";
    const isFounding = session.metadata?.membership_type === "innerg_founding";
    const isVideo = session.metadata?.product_key === VIDEO_PRODUCT;
    if (!uuidPattern.test(userId) || session.payment_status === "unpaid") return Response.json({ received: true });

    if (isVideo) {
      if (Number(session.metadata?.amount_paid_cents ?? 0) !== 1000 || session.amount_total !== 1000) {
        return Response.json({ received: true });
      }
      const { error } = await service.from("innerg_video_access").upsert({
        user_id: userId,
        product_key: VIDEO_PRODUCT,
        status: "active",
        amount_paid_cents: 1000,
        stripe_checkout_session_id: session.id,
        stripe_customer_id: text(session.customer),
        stripe_payment_intent_id: text(session.payment_intent),
        purchased_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,product_key" });
      if (error) {
        console.error("Video access update failed", error);
        return new Response("Video access update failed", { status: 500 });
      }
      return Response.json({ received: true });
    }

    if (isFounding) {
      const plan = paidPlan(session);
      if (!plan) return Response.json({ received: true });
      let periodEnd = yearAfter(event.created);
      if (plan === "monthly") {
        try {
          const subscription = await stripe.subscriptions.retrieve(text(session.subscription)!);
          if (subscription.status !== "active") return new Response("Subscription is not active", {status: 500});
          const end = subscription.items.data[0]?.current_period_end;
          if (!end) return new Response("Subscription period unavailable", {status:500});
          periodEnd = new Date(end * 1000).toISOString();
        } catch { return new Response("Subscription verification failed", {status:500}); }
      }
      const { error } = await service.rpc("fulfill_innerg_checkout", {
        p_user_id:userId,p_session:session.id,p_customer:text(session.customer),p_subscription:text(session.subscription),
        p_plan:plan,p_paid_at:new Date(event.created * 1000).toISOString(),p_period_end:periodEnd,
      });
      if (error) return new Response("Membership update failed", { status: 500 });

      const { data: membership, error: membershipError } = await service
        .from("innerg_memberships").select("membership_number, welcome_email_sent_at")
        .eq("user_id", userId).single();
      if (membershipError || !membership?.membership_number) return new Response("Member number could not be issued", { status: 500 });
      if (!membership.welcome_email_sent_at) {
        try {
          await sendMemberEmail(service, userId, membership.membership_number);
          const { error: receiptError } = await service.from("innerg_memberships").update({
            welcome_email_sent_at: new Date().toISOString(), welcome_email_error: null,
            updated_at: new Date().toISOString(),
          }).eq("user_id", userId);
          if (receiptError) throw new Error("Welcome email receipt could not be saved");
        } catch (emailError) {
          const message = emailError instanceof Error ? emailError.message : "Member email failed";
          await service.from("innerg_memberships").update({
            welcome_email_error: message.slice(0, 500), updated_at: new Date().toISOString(),
          }).eq("user_id", userId);
          return new Response("Member email delivery failed", { status: 500 });
        }
      }
      return Response.json({ received: true });
    }

    if (!expectedPaymentLinkId || text(session.payment_link) !== expectedPaymentLinkId) return Response.json({ received: true });
    const { error } = await service.from("watchlist_memberships").upsert({
      user_id: userId, status: "active", access_source: "stripe",
      stripe_checkout_session_id: session.id, stripe_customer_id: text(session.customer),
      stripe_subscription_id: text(session.subscription), stripe_payment_intent_id: text(session.payment_intent),
      paid_at: new Date().toISOString(), access_granted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) return new Response("Membership update failed", { status: 500 });
  }

  if (["customer.subscription.deleted","customer.subscription.updated","invoice.payment_failed","invoice.paid"].includes(event.type)) {
    const object = event.data.object as any;
    const subscriptionId = event.type.startsWith("customer.subscription.") ? object.id : text(object.parent?.subscription_details?.subscription);
    if (subscriptionId) {
      try {
        // Read Stripe's current state, not an older event's embedded status.
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const state = subscription.status === "active" ? "active" : subscription.status === "canceled" ? "canceled" : "past_due";
        const end = subscription.items.data[0]?.current_period_end;
        const {error} = await service.rpc("sync_innerg_subscription", {
          p_subscription:subscriptionId,p_status:state,p_end:end ? new Date(end*1000).toISOString() : null,
          p_event_at:new Date(event.created*1000).toISOString(),
        });
        if(error) return new Response("Subscription update failed",{status:500});
      } catch { return new Response("Subscription verification failed",{status:500}); }
    }
  }
  return Response.json({ received: true });
});
