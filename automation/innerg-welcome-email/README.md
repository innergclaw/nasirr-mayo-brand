# INNERG welcome email

This Google Apps Script sends the paid-member welcome email from the OwnYourWeb Gmail account.

Current status: deployed and connected on September 6, 2026. Supabase `watchlist-stripe-webhook` version 12 sends paid-member welcome emails through OwnYourWeb Gmail. Its Stripe signature verification and existing membership/payment branches remain intact.

On September 5, 2026, a separate Gmail connector test was sent from `ownyourwebsmm@gmail.com` to `nasgfx215@gmail.com`. Receipt was verified in the recipient inbox at 6:40 PM. Subject: `[TEST] INNERG welcome email preview`. Gmail message ID: `1a073bb44ea4cdd2`. This proves sender delivery, not the automated Stripe workflow.

Apps Script project under OwnYourWeb: `1qwqHu0d13FNN5WZ2YH6K4Yjr-78UtwnTcHxNPggSMqV13rxgyFkIOXPz`, deployed version 1. The deployed editor uses a compact equivalent template and stricter member-ID validation. `Code.gs` is a reference implementation, not an exact deployment backup. Do not overwrite the editor without reconciling it first.

## Verification on September 6

- Supabase called the deployed Google endpoint successfully. Gmail sent to `nasgfx215@gmail.com`, subject `Your INNERG ID is active: TEST-CONNECTION-20260906`.
- Receipt verified in the recipient Inbox at 5:18 AM America/New_York. Sender copy ID: `1a076031336a7cbe`.
- Repeating the identical request returned `duplicate: true`; only one matching sender copy was found.
- The temporary connection-test function is disabled (version 3, JWT required, inert handler).
- Live production source matches `stripe-webhook.ts` and `gmail.ts`. Unsigned production webhook requests return HTTP 400.
- `node automation/innerg-welcome-email/connection.test.mjs` tests successful delivery, duplicates, HTTP failure, rejected delivery, non-JSON response, timeout, missing key, and invalid endpoint.
- `node automation/innerg-welcome-email/payment-flow.test.mjs` tests six isolated payment branches with local mocks: paid, unpaid, invalid signature, already sent, email failure, and receipt-write failure.
- No live checkout, charge, fake membership, or bulk member email was created. A complete Stripe checkout-to-email transaction has not been performed in this verification.

## Operational limits

Google MailApp sending quotas apply. A `sending` property without `sent` means the delivery outcome is uncertain; review Gmail Sent and Apps Script execution logs before manually clearing it. This avoids blind duplicate sends. Failed deliveries return HTTP 500 to Stripe and record `welcome_email_error`. Do not backfill existing members without approval.

The existing user-selected shared password was retained as requested. It remains a security weakness compared with a random secret. No credentials are stored here.

## Event flow

1. Stripe confirms the $10 monthly INNERG membership.
2. The Supabase Stripe webhook activates the membership and issues the INNERG ID.
3. The webhook calls the publicly reachable, shared-secret-protected Google Apps Script endpoint.
4. Gmail sends one welcome email from `ownyourwebsmm@gmail.com`.
5. Google records each sent member ID under a script lock; Supabase records `welcome_email_sent_at`. Replays return success without another send.

## Google Apps Script setup

Create and deploy the script while signed in as `ownyourwebsmm@gmail.com`.

1. Paste `Code.gs` into a new Apps Script project named `INNERG Member Welcome`.
2. Add the script property `WEBHOOK_SECRET` with a long random value.
3. Deploy it as a web app that executes as the owner.
4. Allow access for anyone with the web app URL. The shared secret protects the endpoint.
5. `gmail.ts` defaults to the verified deployment URL. Optional override: Supabase secret `INNERG_GMAIL_WEBHOOK_URL`.
6. Store the same shared secret in `INNERG_GMAIL_WEBHOOK_SECRET`.

Never place either secret in the public website or this repository.
