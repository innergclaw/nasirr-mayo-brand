export const ACCOUNT_PATH = "/account/";
export const DASHBOARD_PATH = "/dashboard/";
export const INNERG_ID_PATH = "/innerg-id/";
export const ALLOWED_DESTINATIONS = new Set([INNERG_ID_PATH, DASHBOARD_PATH, "/innergid/", "/membership/"]);

export const getSafeDestination = (search = "") => {
  const requested = new URLSearchParams(String(search).replace(/^\?/, "")).get("next");
  return ALLOWED_DESTINATIONS.has(requested) ? requested : INNERG_ID_PATH;
};

export const isRecoveryCallback = (hash = "") => {
  const params = new URLSearchParams(String(hash).replace(/^#/, ""));
  return params.get("type") === "recovery";
};

export const shouldRedirectToDestination = ({
  session,
  recovery = false,
  currentPath = ACCOUNT_PATH,
  accountPath = ACCOUNT_PATH,
  destination = INNERG_ID_PATH,
} = {}) => Boolean(
  session && !recovery && currentPath === accountPath && destination && destination !== accountPath,
);

export const shouldRedirectToAccount = ({
  session,
  currentPath = INNERG_ID_PATH,
  protectedPath = currentPath,
} = {}) => Boolean(!session && currentPath === protectedPath);
