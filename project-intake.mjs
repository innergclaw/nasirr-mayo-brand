export const PHONE = "+12674730397";
export const BUDGETS = ["$100-$250", "$250 - $500", "$750 - $1000"];
export const DELIVERY = ["ASAP", "A Few Days", "A Few Weeks", "Not Sure"];

export function validateDetails(details) {
  const errors = {};
  for (const [key, label, max] of [["firstName", "first name", 60], ["lastName", "last name", 60], ["service", "service needed", 500]]) {
    const value = String(details[key] || "").trim();
    if (!value) errors[key] = `Enter your ${label}.`;
    else if (String(details[key]).length > max) errors[key] = `Keep ${label} to ${max} characters or fewer.`;
  }
  if (!BUDGETS.includes(details.budget)) errors.budget = "Select one of the listed budgets.";
  if (!DELIVERY.includes(details.delivery)) errors.delivery = "Select an expected delivery timeframe.";
  return errors;
}

export function buildMessage(details) {
  if (Object.keys(validateDetails(details)).length) throw new Error("Complete the project details before preparing a text.");
  const name = `${details.firstName.trim()} ${details.lastName.trim()}`.replace(/[\r\n]+/g, " ");
  return `Hi Nasirr, I'd like to discuss a project.\n\nName: ${name}\nService needed: ${details.service.trim()}\nBudget: ${details.budget}\nExpected delivery: ${details.delivery}\n\nSent from nasirr.innergintel.org`;
}

export function buildSmsHref(message) {
  // Match the SMS handoff already used by Home Base mentorship.
  return `sms:${PHONE}?&body=${encodeURIComponent(message)}`;
}

export function initIntake(form) {
  if (!form || form.dataset.intakeReady === "true") return;
  form.dataset.intakeReady = "true";
  const status = form.querySelector("#project-intake-status");
  const counter = form.querySelector("#project-service-count");
  const manual = form.querySelector("#project-intake-manual");
  const preview = form.querySelector("#project-intake-message");
  const sms = form.querySelector("#project-intake-sms");
  const fields = ["firstName", "lastName", "service", "budget", "delivery"];

  const prepare = () => {
    const details = Object.fromEntries(new FormData(form));
    const errors = validateDetails(details);
    fields.forEach(name => {
      const field = form.elements.namedItem(name);
      field.setCustomValidity(errors[name] || "");
      if (errors[name]) field.setAttribute("aria-invalid", "true");
      else field.removeAttribute("aria-invalid");
    });
    if (!form.reportValidity()) return null;
    return buildMessage(details);
  };

  const update = event => {
    if (fields.includes(event.target.name)) {
      event.target.setCustomValidity("");
      event.target.removeAttribute("aria-invalid");
    }
    counter.textContent = `${form.elements.namedItem("service").value.length} / 500`;
    status.textContent = "";
    manual.hidden = true;
    preview.value = "";
    sms.href = `sms:${PHONE}`;
  };
  form.addEventListener("input", update);
  form.addEventListener("change", update);

  form.addEventListener("submit", event => {
    event.preventDefault();
    const message = prepare();
    if (!message) return;
    sms.href = buildSmsHref(message);
    status.textContent = "Your text is ready. Tap send in your messaging app. If it did not open, use Copy details instead.";
    sms.click();
  });

  form.querySelector("#project-intake-copy").addEventListener("click", async () => {
    const message = prepare();
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      status.textContent = "Details copied. Paste them into a text to 267 473 0397, then tap send.";
    } catch {
      preview.value = message;
      manual.hidden = false;
      preview.focus();
      preview.select();
      status.textContent = "Copy the message below, then text it to 267 473 0397.";
    }
  });
  form.querySelector("#project-intake-send").disabled = false;
  form.querySelector("#project-intake-copy").disabled = false;
}

if (typeof document !== "undefined") initIntake(document.getElementById("project-intake-form"));
