import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sendGmail } from "./gmail.ts";
import Stripe from "npm:stripe@22.6.1";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const expectedPaymentLinkId = Deno.env.get("STRIPE_PAYMENT_LINK_ID") ?? "";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VIDEO_PRODUCT = "end_of_year_frequency_2026";

const text = (value: unknown) => typeof value === "string" ? value : value && typeof value === "object" && "id" in value ? String(value.id) : null;
async function sendMemberEmail(service: ReturnType<typeof createClient>, userId: string, membershipNumber: string) {
  const { data: { user }, error: userError } = await service.auth.admin.getUserById(userId);
  if (userError || !user?.email) throw new Error("Member email is not available");
  await sendGmail({ email: user.email, memberId: membershipNumber, firstName: "member" });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!stripeKey || !webhookSecret || !expectedPaymentLinkId) return new Response("Stripe is not configured", { status: 503 });
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
      const amount = Number(session.metadata?.monthly_amount_cents ?? 0);
      if (amount !== 1000) return Response.json({ received: true });
      const { error } = await service.from("innerg_memberships").upsert({
        user_id: userId, status: "active", membership_type: "founding",
        monthly_amount_cents: amount, access_source: "stripe", payment_verified: true,
        stripe_checkout_session_id: session.id, stripe_customer_id: text(session.customer),
        stripe_subscription_id: text(session.subscription), joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) return new Response("Membership update failed", { status: 500 });
      const { error: watchlistError } = await service.from("watchlist_memberships").upsert({
        user_id: userId, status: "active", access_source: "innerg_membership",
        stripe_checkout_session_id: session.id, stripe_customer_id: text(session.customer),
        stripe_subscription_id: text(session.subscription), paid_at: new Date().toISOString(),
        access_granted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (watchlistError) return new Response("Watchlist access update failed", { status: 500 });

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

    if (text(session.payment_link) !== expectedPaymentLinkId) return Response.json({ received: true });
    const { error } = await service.from("watchlist_memberships").upsert({
      user_id: userId, status: "active", access_source: "stripe",
      stripe_checkout_session_id: session.id, stripe_customer_id: text(session.customer),
      stripe_subscription_id: text(session.subscription), stripe_payment_intent_id: text(session.payment_intent),
      paid_at: new Date().toISOString(), access_granted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) return new Response("Membership update failed", { status: 500 });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    await service.from("watchlist_memberships").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscription.id);
    await service.from("innerg_memberships").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscription.id);
  }

  if (event.type === "invoice.payment_failed" || event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = text(invoice.parent?.subscription_details?.subscription);
    if (subscriptionId) {
      await service.from("watchlist_memberships").update({ status: event.type === "invoice.paid" ? "active" : "past_due", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscriptionId);
      await service.from("innerg_memberships").update({ status: event.type === "invoice.paid" ? "active" : "past_due", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscriptionId);
    }
  }
  return Response.json({ received: true });
});
