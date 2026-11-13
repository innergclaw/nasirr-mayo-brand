// INNERG ID plans: the one place for names and prices shown on /membership/.
// Must match innerg-membership-checkout (innergclaw/innerg-id) and the database payment rule.
export const PLANS = {
  child: { label: "Individual", priceText: "$30.00 a month", cents: 3000, interval: "month", seats: 1 },
  parent: { label: "Team lead", priceText: "$75.00 a month", cents: 7500, interval: "month", seats: 0 },
  family: { label: "Organization", priceText: "$250.00 a year", cents: 25000, interval: "year", seats: 3, referencePriceText: "$390.00 regular price" },
};

export const PENDING_PLAN_KEY = "innerg_pending_plan";

export const readPendingPlan = (storage) => {
  try {
    const value = storage?.getItem(PENDING_PLAN_KEY) || "";
    return Object.hasOwn(PLANS, value) ? value : null;
  } catch { return null; }
};

// /account/ only allows known destinations; /membership/ is one of them.
export const signInUrl = () => "/account/?next=%2Fmembership%2F";

// Yearly cost of 2 parents + 2 children on monthly plans, for the Family comparison line.
export const familyComparison = (plans = PLANS) => (plans.parent.cents * 2 + plans.child.cents * 2) * 12 / 100;
