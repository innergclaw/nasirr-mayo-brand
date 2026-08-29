export const ACCOUNT_PATH = "/account/";
export const DASHBOARD_PATH = "/dashboard/";

export const isRecoveryCallback = (hash = "") => {
  const params = new URLSearchParams(String(hash).replace(/^#/, ""));
  return params.get("type") === "recovery";
};

export const shouldRedirectToDashboard = ({
  session,
  recovery = false,
  currentPath = ACCOUNT_PATH,
  accountPath = ACCOUNT_PATH,
  dashboardPath = DASHBOARD_PATH,
} = {}) => Boolean(
  session && !recovery && currentPath === accountPath && dashboardPath && dashboardPath !== accountPath,
);

export const shouldRedirectToAccount = ({
  session,
  currentPath = DASHBOARD_PATH,
  dashboardPath = DASHBOARD_PATH,
} = {}) => Boolean(!session && currentPath === dashboardPath);
