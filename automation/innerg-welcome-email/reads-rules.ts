export const READ_SLUG = "art-era";
export const READ_PRICE = 100;

export function paidRead(session: any, secretHash: string): boolean {
  const item = session.line_items?.data;
  return Boolean(session.status === "complete" && session.payment_status === "paid" &&
    session.mode === "payment" && session.currency === "usd" && session.amount_total === READ_PRICE &&
    session.metadata?.product_key === "innerg_read" && session.metadata?.read_slug === READ_SLUG &&
    session.metadata?.access_hash === secretHash &&
    item?.length === 1 && item[0].quantity === 1 && item[0].price?.unit_amount === READ_PRICE &&
    item[0].price?.currency === "usd");
}

export function settledCharge(intent: any): boolean {
  const charge = intent?.latest_charge;
  return Boolean(intent?.status === "succeeded" && intent.amount_received === READ_PRICE &&
    intent.currency === "usd" && charge && typeof charge === "object" &&
    charge.paid && !charge.disputed && !charge.refunded && charge.amount_refunded === 0);
}
