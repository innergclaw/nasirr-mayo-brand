import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { sendTrialGmail } from "./trial-gmail.ts";

type TrialStage = "trial_day_0" | "trial_day_3" | "trial_day_6" | "trial_day_7";
type Delivery = {
  delivery_id: string;
  lease_token: string;
  stage: TrialStage;
  email: string;
  member_id: string;
  first_name: string;
  access_expires_at: string;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const workerSecret = req.headers.get("x-worker-secret") ?? "";
  if (!workerSecret) return new Response("Unauthorized", { status: 401 });

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const service = createClient(url, serviceKey);
  const { data, error } = await service.rpc("lease_innerg_trial_emails", {
    p_worker_secret: workerSecret,
    p_limit: 20,
  });
  if (error) {
    console.error("Trial email lease failed", error);
    return new Response("Unauthorized", { status: 401 });
  }

  let sent = 0;
  let failed = 0;
  for (const delivery of (data || []) as Delivery[]) {
    let success = false;
    let failure = "";
    try {
      await sendTrialGmail({
        email: delivery.email,
        memberId: delivery.member_id,
        firstName: delivery.first_name || "member",
        messageType: delivery.stage,
        accessExpiresAt: delivery.access_expires_at,
      });
      success = true;
      sent += 1;
    } catch (sendError) {
      failure = sendError instanceof Error ? sendError.message : "Trial email failed";
      failed += 1;
    }
    const { error: receiptError } = await service.rpc("complete_innerg_trial_email", {
      p_worker_secret: workerSecret,
      p_delivery_id: delivery.delivery_id,
      p_lease_token: delivery.lease_token,
      p_success: success,
      p_error: failure.slice(0, 500),
    });
    if (receiptError) console.error("Trial email receipt failed", receiptError);
  }
  return Response.json({ ok: true, leased: data?.length || 0, sent, failed });
});
