export const ACTIVATION_DELAYS_MS = [0, 750, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000];

export const isCheckoutReturn = (search = "") => (
  new URLSearchParams(String(search).replace(/^\?/, "")).get("membership") === "success"
);

export const classifyMemberAccess = ({
  hasSession = false,
  membershipNumber = "",
  statusCode = 0,
  checkoutReturn = false,
  attempt = 0,
  maxAttempts = ACTIVATION_DELAYS_MS.length,
} = {}) => {
  if (!hasSession) return "sign-in";
  if (membershipNumber) return "active";
  if (checkoutReturn && (statusCode === 403 || statusCode === 409)) {
    return attempt < maxAttempts - 1 ? "retry" : "processing";
  }
  if (statusCode === 403) return "activate";
  if (statusCode === 409) return "processing";
  return "error";
};
