export function paidPlan(session: any): "monthly" | "yearly" | null {
  if (session.payment_status !== "paid" || session.currency !== "usd") return null;
  const plan = session.metadata?.billing_plan ?? "monthly";
  if (plan === "monthly" && session.mode === "subscription" && session.amount_total === 1000 && session.subscription) return "monthly";
  if (plan === "yearly" && session.mode === "payment" && session.amount_total === 10000 && !session.subscription) return "yearly";
  return null;
}
export function yearAfter(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const month = date.getUTCMonth();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  if (date.getUTCMonth() !== month) date.setUTCDate(0);
  return date.toISOString();
}
