# INNERG PULSE signup setup

The page is `https://nasirr.innergintel.org/pulse/`. Signup stores a subscriber only after a one-time code is entered on that page. The public Supabase key cannot read the list.

Project: `zkyhhoxcrjkhywblzehr` (`https://zkyhhoxcrjkhywblzehr.supabase.co`).

The migration and the `innerg-pulse` function were applied to that project on October 21, 2026. Do not run the migration a second time there. Mail is not configured yet, so the page will say it could not send mail until you finish step 3.

## 1. Database

Migration file: `supabase/migrations/20261021160000_pulse_subscribers.sql`.

It creates `pulse_subscribers` and `pulse_rate_events`, turns on row level security, and grants no access to `anon` or `authenticated`. Codes are stored as HMAC hashes. The pepper is created in Vault as `pulse_otp_pepper`.

If this migration is not on the project yet, apply that file in the Supabase SQL editor, or with the CLI:

```bash
supabase db query --linked -f supabase/migrations/20261021160000_pulse_subscribers.sql
```

Do not run it twice. The pepper insert is skipped when `pulse_otp_pepper` already exists, but the tables are created only once.

## 2. Edge Function

Source: `supabase/functions/innerg-pulse/`.

`supabase/config.toml` sets `verify_jwt = false` for this function only. The page is public. The function still refuses to activate a subscription without the emailed code. Keep JWT checks on for the other functions.

```bash
supabase functions deploy innerg-pulse --project-ref zkyhhoxcrjkhywblzehr --no-verify-jwt
```

## 3. Mail, pick one path

The function sends nothing until one path below is configured. Set the secrets, then redeploy `innerg-pulse` so the new values are loaded.

### Path A, Gmail (same sender account as member mail)

1. Sign in to Apps Script as `ownyourwebsmm@gmail.com`.
2. Create a project named `INNERG PULSE codes`.
3. Paste `automation/pulse-email/Code.gs`. Do not paste it over the member welcome script.
4. In Project Settings, Script properties, add `WEBHOOK_SECRET` with a long random value.
5. Deploy as a web app. Execute as the owner. Access: anyone with the web app URL.
6. Copy the `/exec` URL.

```bash
supabase secrets set \
  PULSE_GMAIL_WEBHOOK_URL="https://script.google.com/macros/s/DEPLOYMENT_ID/exec" \
  PULSE_GMAIL_WEBHOOK_SECRET="the-same-webhook-secret" \
  --project-ref zkyhhoxcrjkhywblzehr
```

Gmail consumer accounts have a daily MailApp quota. A repeated send of the same code to the same address is ignored by the script.

### Path B, Resend

Verify the sending domain in Resend, then:

```bash
supabase secrets set \
  RESEND_API_KEY="re_your_key" \
  PULSE_FROM_EMAIL="INNERG PULSE <pulse@innergintel.org>" \
  --project-ref zkyhhoxcrjkhywblzehr
```

### Path C, Brevo

Use a key for this list. Do not reuse another product key from Vault.

```bash
supabase secrets set \
  PULSE_BREVO_API_KEY="your-brevo-key" \
  PULSE_FROM_EMAIL="INNERG PULSE <pulse@innergintel.org>" \
  --project-ref zkyhhoxcrjkhywblzehr
```

`PULSE_FROM_EMAIL` must be a sender that provider has already verified. If more than one path is set, Gmail is used first, then Resend, then Brevo.

## 4. Smoke test

Open `/pulse/`, enter an email you can read, and confirm the code from that inbox. The page should move through code sent, then confirmed. A wrong code should stay on the code step and say the code is wrong or expired.

Unsubscribe with the link in that email: `https://nasirr.innergintel.org/pulse/unsubscribe/?token=...`. The address is marked `unsubscribed` only after the button is pressed, so mail scanners that only open the link do not remove people.

## 5. Future issues

Read active subscribers from the Supabase SQL editor (owner access), not from the public API:

```sql
select email, unsubscribe_token
from public.pulse_subscribers
where status = 'active';
```

Put this link in every issue:

`https://nasirr.innergintel.org/pulse/unsubscribe/?token=` plus `unsubscribe_token`.

The same token stays on the row so older issues keep working. Commercial issues should also include your postal address. That address is not stored in this repo.

The function also accepts a one-click unsubscribe POST when the request reaches it:

`POST /functions/v1/innerg-pulse?token=TOKEN`

Body: `List-Unsubscribe=One-Click`

Content-Type: `application/x-www-form-urlencoded`

Mailbox providers may not send the Supabase `apikey` header. Use the web link above as the CAN-SPAM path until a one-click POST is verified from the mailbox.

## 6. Limits

- 5 code emails per address per hour
- 20 code emails per IP per hour
- 10 confirm tries per address per hour
- 5 wrong codes burn the current code
- Codes expire after 15 minutes
- A hidden `pulse_hp` field drops bot submits without sending mail

## 7. Leave the watchlist mirror alone

Do not edit `watchlist/` for this list. That folder is synced from the Market Pulse source repo.
