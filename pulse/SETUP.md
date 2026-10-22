# INNERG PULSE signup setup

The page is `https://nasirr.innergintel.org/pulse/`. A visitor enters an email, Supabase Auth emails an 8-digit code, and the address becomes active only after that code is checked. The public Supabase key cannot read the list.

Project: `zkyhhoxcrjkhywblzehr` (`https://zkyhhoxcrjkhywblzehr.supabase.co`).

The list tables were created on October 21, 2026. The Auth handoff in `supabase/migrations/20261021173000_pulse_auth_otp.sql` was applied the same day. Do not run `supabase/migrations/20261021160000_pulse_subscribers.sql` again on this project. The Auth handoff is safe to run again.

Until custom SMTP is saved, Auth's built-in mailer only delivers to addresses on the organization team, and only a few messages an hour. Everyone else sees "The desk could not send mail just now."

## 1. Database

Fresh database, in order:

1. `supabase/migrations/20261021160000_pulse_subscribers.sql`
2. `supabase/migrations/20261021173000_pulse_auth_otp.sql`

This project already has both. The second file drops the old code columns and the old code functions. Codes are no longer stored in `pulse_subscribers`. Auth stores and checks them.

`pulse_subscribers` keeps email, status (`pending`, `active`, `unsubscribed`), timestamps, `unsubscribe_token`, and `auth_user_id`. `auth_user_id` points at the Auth user for that email. Deleting that Auth user clears the pointer and leaves the list row. It does not grant an INNERG ID membership.

Row level security stays on. `anon` and `authenticated` have no grants.

## 2. Edge Function

Source: `supabase/functions/innerg-pulse/`.

`supabase/config.toml` sets `verify_jwt = false` for this function only. The page is public. The function still refuses to activate a subscription until Auth accepts the emailed code. Keep JWT checks on for the other functions.

```bash
supabase functions deploy innerg-pulse --project-ref zkyhhoxcrjkhywblzehr --no-verify-jwt
```

The deployed function calls `POST /auth/v1/otp` and `POST /auth/v1/verify` with `type` set to `email`. That one type matches both a first-time code and a code for an address that already has an Auth user. After a match, the function marks the row active, sets `app_metadata.pulse_subscriber` to true, and signs out only that new session (`scope=local`). It does not send the session to the browser.

## 3. Email template

Auth has one Magic Link template and one Confirm signup template for the whole project. INNERG ID sign-in on `/account/` uses the same templates. Use a neutral code message. Do not write a PULSE-only letter here, or member sign-in mail will say it is only the newsletter.

Open [Magic Link](https://supabase.com/dashboard/project/zkyhhoxcrjkhywblzehr/auth/templates) and [Confirm signup](https://supabase.com/dashboard/project/zkyhhoxcrjkhywblzehr/auth/templates).

A new, unconfirmed address gets the Confirm signup template when Confirm email is enabled. An address that is already confirmed, including an INNERG ID member, gets the Magic Link template. Put the same code body in both.

Subject, both templates:

`Your INNERG verification code`

Body, both templates:

```html
<h2>Your verification code</h2>
<p>Enter this code on the page that asked for it:</p>
<p>{{ .Token }}</p>
<p>It expires in 15 minutes. If you did not request it, you can ignore this email.</p>
<p>This code confirms an INNERG ID sign-in or a free INNERG PULSE subscription. This is news, not financial advice.</p>
```

`{{ .Token }}` is the 8-digit code. Do not include `{{ .ConfirmationURL }}` or `{{ .TokenHash }}`. A link in this message signs the browser into Auth. The signup page and the INNERG ID page both ask the person to type the code instead.

Leave the reset-password template on its link. This change is only the two templates above.

## 4. Code length and expiry

Auth already sends an 8-digit code. INNERG ID member sign-in uses that same length. Do not change it in the Supabase dashboard.

`/pulse/` accepts 8 digits. `pulse_confirm_gate` rejects any other length before the code is checked with Auth.

Open [Email provider](https://supabase.com/dashboard/project/zkyhhoxcrjkhywblzehr/auth/providers), then Email, then set **Email OTP expiration** to `900` seconds (15 minutes). Save.

That clock is shared. `900` also shortens INNERG ID magic links, signup confirmation links, password recovery links, email-change links, and invite links. If those links need to stay at the default hour, leave the value at `3600` and change the sentence on `/pulse/` that says the code expires in 15 minutes. The page currently says 15 minutes.

Auth also waits about 60 seconds before it will email another code to the same address.

## 5. Custom SMTP with a Gmail app password

The built-in mailer is not enough for a public list. Connect Gmail SMTP. Do not put the app password in this repo, and do not paste it into an Edge Function secret. It belongs only in the Auth SMTP form.

1. Use the Google account that should send the codes. `ownyourwebsmm@gmail.com` is the account already used for member mail.
2. Turn on 2-Step Verification for that Google account.
3. Open `https://myaccount.google.com/apppasswords`.
4. Create an app password named `INNERG Auth`. Copy the 16-character password.
5. Open [SMTP settings](https://supabase.com/dashboard/project/zkyhhoxcrjkhywblzehr/auth/smtp).
6. Enable custom SMTP.
7. Host: `smtp.gmail.com`
8. Port: `587`
9. Username: the full Gmail address
10. Password: the app password from step 4
11. Sender email: the same Gmail address
12. Sender name: `INNERG INTEL`
13. Save.

Gmail consumer accounts have a daily sending cap. After SMTP is on, Auth starts near 30 messages an hour until you raise it. Open [Rate limits](https://supabase.com/dashboard/project/zkyhhoxcrjkhywblzehr/auth/rate-limits) and set the email limit to a number the Gmail account can sustain.

This SMTP path replaces the Apps Script, Resend, and Brevo options. Those are not used.

## 6. Smoke test

Open `/pulse/`, enter an email you can read, and confirm the code from that inbox. The page should move through code sent, then confirmed. A wrong code should stay on the code step and say the code is wrong or expired.

The browser does not keep an Auth session from this page. Signing in at `/account/` is a separate step. A confirmed newsletter address can later request a code there, the same as any address that has verified with Auth and has no membership yet. Member pages still require a row in `innerg_memberships`.

Unsubscribe with the link you place in a future issue: `https://nasirr.innergintel.org/pulse/unsubscribe/?token=...`. The Auth code email cannot carry that per-address token. The address is marked `unsubscribed` only after the button is pressed, so mail scanners that only open the link do not remove people.

## 7. Future issues

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

## 8. Limits

The page still applies its own limits, hashed, with no raw email or IP stored:

- 5 code requests per address per hour
- 20 code requests per IP per hour
- 10 confirm tries per address per hour
- 30 confirm tries per IP per hour
- A hidden `pulse_hp` field drops bot submits without calling Auth

Auth adds its own limit of about one code email per address per minute.

## 9. Leave the watchlist mirror alone

Do not edit `watchlist/` for this list. That folder is synced from the Market Pulse source repo.

## 10. What this does not change

Newsletter signup does not insert into `innerg_memberships`, does not call the member checkout functions, and does not sign the visitor in on the site. `app_metadata.pulse_subscriber` is only a marker that the service role can set. Member checks do not read it.
