import { paidRead, settledCharge, READ_SLUG } from "./reads-rules.ts";

export async function fulfillRead(stripe: any, service: any, sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items", "payment_intent.latest_charge"] });
  const accessHash = session.metadata?.access_hash;
  if (!accessHash || !paidRead(session, accessHash) || !settledCharge(session.payment_intent)) return;
  const { data, error: lookupError } = await service.from("innerg_read_purchases").select("id,session_id,status")
    .eq("access_hash", accessHash).eq("slug", READ_SLUG).maybeSingle();
  if (lookupError || !data || (data.session_id && data.session_id !== sessionId)) throw new Error("Read purchase mismatch");
  if (data.status === "paid" || data.status === "revoked") return;
  const { error } = await service.from("innerg_read_purchases").update({
    session_id: sessionId,
    status: "paid",
    paid_at: new Date().toISOString(),
  }).eq("id", data.id);
  if (error) throw new Error("Read purchase save failed");
}
