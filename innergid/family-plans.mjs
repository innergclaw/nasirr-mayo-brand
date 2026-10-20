// INNERG family membership tiers ~ the ONE place to set prices and links.
// Leave price as null until Mr G sets it. While null, the card shows
// "pricing coming soon" and the contact button below.
// checkoutUrl: null until a real checkout exists for that tier.
export const CONTACT_URL = "mailto:ownyourwebsmm@gmail.com?subject=INNERG%20family%20membership";

export const FAMILY_PLANS = [
  {
    id: "child",
    name: "Child membership",
    audience: "For one learner in grades 3 through 12.",
    price: null,      // e.g. "$__ / month"
    checkoutUrl: null,
  },
  {
    id: "parent",
    name: "Parent membership",
    audience: "For a parent or guardian learning the same skills at their level.",
    price: null,
    checkoutUrl: null,
  },
  {
    id: "family",
    name: "Family membership",
    audience: "For the whole household. A discount applies when more than one member joins.",
    price: null,
    discountNote: null, // e.g. "$__ off each extra member"
    checkoutUrl: null,
  },
];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function renderFamilyPlans(plans = FAMILY_PLANS, contactUrl = CONTACT_URL) {
  return plans.map(p => {
    const ready = p.price && p.checkoutUrl;
    const price = p.price ? esc(p.price) : "pricing coming soon";
    const note = p.discountNote ? `<p class="family-plan-discount">${esc(p.discountNote)}</p>` : (p.id === "family" ? `<p class="family-plan-discount">multi-member discount coming soon</p>` : "");
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
