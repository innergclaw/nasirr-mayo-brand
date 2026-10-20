// INNERG family membership tiers ~ the ONE place to set prices and links.
// Leave price as null until Mr G sets it. While null, the card shows
// "pricing coming soon" and the contact button below.
// checkoutUrl: null until a real checkout exists for that tier.
export const CONTACT_URL = "mailto:ownyourwebsmm@gmail.com?subject=INNERG%20family%20membership";

export const FAMILY_PLANS = [
  {
    id: "child",
    name: "Child membership",
    audience: "The student curriculum and lessons, built for grades 3 through 12. Your child gets their own INNERG ID.",
    monthly: 9,
    price: "$9 / month",
    checkoutUrl: null,
  },
  {
    id: "parent",
    name: "Parent membership",
    audience: "A separate parent curriculum and lessons, made for parents and guardians. Not the same as the student lessons. You get your own INNERG ID.",
    monthly: 29,
    price: "$29 / month",
    checkoutUrl: null,
  },
  {
    id: "family",
    name: "Family membership",
    audience: "Everything: both the student curriculum and the parent curriculum, for up to 4 members. Each member gets their own INNERG ID.",
    yearly: 99,
    maxMembers: 4,
    price: "$99 / year, up to 4 members",
    discountNote: null, // computed below from the child and parent prices
    checkoutUrl: null,
  },
];

// Savings vs paying monthly for 12 months, computed from the prices above.
export function familySavings(parents, children, plans = FAMILY_PLANS) {
  const by = id => plans.find(p => p.id === id);
  const separate = (parents * by("parent").monthly + children * by("child").monthly) * 12;
  return { separate, save: separate - by("family").yearly };
}
export function familySavingsLines(plans = FAMILY_PLANS) {
  const a = familySavings(1, 1, plans), b = familySavings(2, 2, plans);
  return [
    `A parent and child would pay $${a.separate}/year separately. Save $${a.save}.`,
    `2 parents + 2 children: $${b.separate}/year separately, save $${b.save}.`,
  ];
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function renderFamilyPlans(plans = FAMILY_PLANS, contactUrl = CONTACT_URL) {
  return plans.map(p => {
    const ready = p.price && p.checkoutUrl;
    const price = p.price ? esc(p.price) : "pricing coming soon";
    const note = p.discountNote ? `<p class="family-plan-discount">${esc(p.discountNote)}</p>` : (p.id === "family" && p.yearly ? familySavingsLines(plans).map(l => `<p class="family-plan-discount">${esc(l)}</p>`).join("") : "");
    const cta = ready
      ? `<a class="card-action" href="${esc(p.checkoutUrl)}">Join with ${esc(p.name.toLowerCase())}</a>`
      : `<a class="card-action" href="${esc(contactUrl)}">Ask to be notified</a>`;
    return `<article class="family-plan" data-plan="${esc(p.id)}"><p class="eyebrow">${esc(p.name)}</p><p class="family-plan-price">${price}</p><p>${esc(p.audience)}</p>${note}${cta}</article>`;
  }).join("");
}

if (typeof document !== "undefined") {
  const el = document.querySelector("#family-plan-cards");
  if (el) el.innerHTML = renderFamilyPlans();
}
