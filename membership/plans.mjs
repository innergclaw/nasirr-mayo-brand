// INNERG ID plans: the one place for names and prices shown on /membership/.
// Must match innerg-membership-checkout (innergclaw/innerg-id) and the database payment rule.
export const PLANS = {
  individual: { label: "Individual", priceText: "$75.00 a month", cents: 7500, interval: "month", seats: 0 },
  team: { label: "Small team", priceText: "$350.00 a year", cents: 35000, interval: "year", seats: 9 },
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
export const teamComparison = (plans = PLANS) => plans.individual.cents * 4 * 12 / 100;
