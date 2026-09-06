export async function sendGmail(payload: {email:string; memberId:string; firstName:string}, fetcher: typeof fetch = fetch) {
  const secret = Deno.env.get("INNERG_GMAIL_WEBHOOK_SECRET");
  if (!secret) throw new Error("Gmail connection key is not configured");
  const url = Deno.env.get("INNERG_GMAIL_WEBHOOK_URL") || "https://script.google.com/macros/s/AKfycbyha0CZV3EqKiL-d5SlTNopMLY6iA38NuqU-pz1kyUo9NwaWlMswSp-GaTPtGHqyhbilg/exec";
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) throw new Error("Invalid Gmail endpoint");
  const response = await fetcher(url, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...payload,secret}), signal:AbortSignal.timeout(25000)});
  if (!response.ok) throw new Error("Gmail endpoint HTTP " + response.status);
  const result = await response.json();
  if (result.ok !== true) throw new Error("Gmail delivery rejected: " + String(result.error || "unknown").slice(0,160));
  return {ok:true,duplicate:result.duplicate === true};
}
