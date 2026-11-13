export function pulseAppMetadata(current) {
  const source = current && typeof current === "object" && !Array.isArray(current) ? current : {};
  const next = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === "pulse_subscriber") continue;
    next[key] = value;
  }
  next.pulse_subscriber = true;
  return next;
}

export function classifyAuthFailure(status, body) {
  const code = String(body?.error_code || body?.code || "");
  const msg = String(body?.msg || body?.message || body?.error_description || "");
  const blob = `${code} ${msg}`.toLowerCase();
  if (status === 429 || blob.includes("rate")) return "rate_limited";
  if (status === 403 || blob.includes("otp") || blob.includes("invalid") || blob.includes("expired")) return "invalid_code";
  return "unavailable";
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

function authHeaders(key) {
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

export async function requestAuthOtp({ authUrl, anonKey, fetchImpl, email }) {
  if (!authUrl || !anonKey) return { status: "unavailable" };
  const response = await fetchImpl(`${authUrl}/otp`, {
    method: "POST",
    redirect: "manual",
    headers: authHeaders(anonKey),
    body: JSON.stringify({ email, create_user: true }),
  });
  if (response.status >= 300 && response.status < 400) return { status: "unavailable" };
  if (response.ok) return { status: "sent" };
  const body = await readJson(response);
  const kind = classifyAuthFailure(response.status, body);
  return { status: kind === "invalid_code" ? "unavailable" : kind };
}

export async function verifyAuthOtp({ authUrl, anonKey, fetchImpl, email, code }) {
  if (!authUrl || !anonKey) return { status: "unavailable" };
  const response = await fetchImpl(`${authUrl}/verify`, {
    method: "POST",
    redirect: "manual",
    headers: authHeaders(anonKey),
    body: JSON.stringify({ email, token: code, type: "email" }),
  });
  if (response.status >= 300 && response.status < 400) return { status: "unavailable" };
  const body = await readJson(response);
  if (!response.ok) return { status: classifyAuthFailure(response.status, body) };
  const accessToken = typeof body.access_token === "string" ? body.access_token : "";
  const user = body.user && typeof body.user === "object" ? body.user : null;
  const userEmail = String(user?.email || "").trim().toLowerCase();
  if (!accessToken || !user?.id || userEmail !== email) {
    return { status: "unavailable", accessToken };
  }
  return {
    status: "verified",
    accessToken,
    user: {
      id: user.id,
      app_metadata: user.app_metadata && typeof user.app_metadata === "object" ? user.app_metadata : {},
    },
  };
}

export async function markPulseSubscriber({ authUrl, serviceKey, fetchImpl, user }) {
  if (!authUrl || !serviceKey || !user?.id) return false;
  const response = await fetchImpl(`${authUrl}/admin/users/${user.id}`, {
    method: "PUT",
    redirect: "manual",
    headers: authHeaders(serviceKey),
    body: JSON.stringify({ app_metadata: pulseAppMetadata(user.app_metadata) }),
  });
  return response.ok;
}

export async function revokeAuthSession({ authUrl, anonKey, fetchImpl, accessToken }) {
  if (!authUrl || !anonKey || !accessToken) return false;
  const response = await fetchImpl(`${authUrl}/logout?scope=local`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: "{}",
  });
  return response.ok || response.status === 204;
}
