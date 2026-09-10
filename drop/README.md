# Drop: private publishing inbox

Live route: https://nasirr.innergintel.org/drop/

Owner: existing Founder Dashboard Auth UID. Login uses the same Supabase project, a separate `founder-drop-session` session, and email codes with automatic account creation disabled. Member accounts cannot read or write any inbox content. Text is stored in `founder_drops`, never shipped in static HTML, the service worker, or a public JSON file.

## Send this to my phone

When Nasirr requests delivery of finished copy, insert a row through the authorized Supabase connector into `public.founder_drops`, project `zkyhhoxcrjkhywblzehr`. Include title, body, kind (`post`, `script`, `email`, `research`, `note`), brand, and a stable `delivery_key`. Use SQL string quoting or structured values safely. Use `ON CONFLICT (delivery_key) DO NOTHING`, then read back the saved row to make retries idempotent. Never replace a posted item silently. Do not copy conversation history, credentials, or internal instructions into drafts.

The insert queues a generic alert for every enrolled owner device. A cloud cron runs `founder-drop-push` every minute. Delivery retries at increasing intervals up to five attempts, with leases against overlapping workers. Push services may delay notifications; inspect `founder_drop_deliveries` for acceptance or failure. A push acceptance is not proof the owner saw the alert. Payloads have only the row ID. Notification clicks open that item after owner verification.

No transcript or draft is cached by the service worker. The Auth session persists locally; signing out clears the displayed content. Native sharing only runs on an explicit tap. X opens a composer; it does not publish. Instagram offers copy because web pages cannot prefill an Instagram caption reliably.

## Phone setup

Open `/drop/` on the phone and sign in with the existing founder email. On iPhone use Safari Share → Add to Home Screen. Open the saved app, tap enable notifications, and allow the device prompt. Use send test alert to verify actual phone receipt. Browser permissions cannot be granted from the laptop on behalf of a phone.

## Deployment and verification

Static page uses the existing GitHub Pages deploy. Apply the migration, deploy `founder-drop-push` with JWT gateway verification disabled (the handler verifies owner JWTs or the worker secret), then verify anonymous denial, non-owner denial, founder CRUD, notification leases and duplicate deliveries, private configuration restrictions, responsive UI, and static source privacy. The worker secret lives in Vault; VAPID keys live in an RLS-protected, service-only table. Do not print or commit credentials.
