# INNERG Discord membership connection

The public member page calls `innerg-discord`. Each member links their Discord identity through OAuth with the `identify` scope. Google and email sign-in remain Supabase login methods.

## Access rules

- Active grandfathered members qualify without a payment.
- Paid access requires active status, Stripe as the access source, verified payment, and an unexpired access end date.
- The member number is never an authentication credential.
- One Supabase user can link one Discord identity. Discord identities are unique.
- Only explicitly linked accounts are managed. Existing unlinked Discord roles are untouched.
- Expired or missing memberships lose the Members role. Account deletion retains the mapping for revocation. Support must verify revocation before releasing a deleted account's mapping.

## Runtime

- Project: `zkyhhoxcrjkhywblzehr`
- Function: `innerg-discord`, custom verified Supabase user authentication and separate hashed worker-secret authentication.
- Callback: `https://nasirr.innergintel.org/innerg-id/discord-callback/`
- Discord app: `1546227226876452864`
- Server: `932345408733192202`
- Managed role: `937126089623490661`
- Server secrets: `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_SECRET`. Never put either value in this repository.
- Worker: `innerg-discord-role-sync`, every minute, up to five due links per run. Successful links are rechecked after five minutes. Membership changes make a link due immediately. Removal is asynchronous, not instant.
- Retry handles missing server membership, Discord rate limits, permission errors, and network failures. The member can join the free server and select Check Discord access.
- The bot needs Manage Roles and must remain above Members. It does not need Administrator.

## Verification, 2026-09-06

- 54 deterministic auth, payment, callback, entitlement, and Discord handler checks passed.
- Live Google sign-in, Discord consent, callback, identity persistence, and role grant passed using the founder's existing member account.
- Discord API returned HTTP 200 and confirmed the Members role.
- Scheduled reconciliation processed the linked account with HTTP 200 and zero errors.
- Unauthorized member and worker requests returned HTTP 401.
- Live rollback-only database checks passed for user-bound state, replay rejection, unique Discord identity, and exclusive worker claims.
- Role removal was tested with mocks. No live customer subscription was canceled for testing.
- Existing legacy role holders and channel permission configuration need a separate review before claiming that all paid channels are protected.

Run: `node --test supabase/functions/innerg-discord/*.test.mjs innerg-id/discord-callback/callback.test.mjs`

## Operations

Check `innerg_discord_links.sync_status` for `sync_error`, `retry`, or `join_server`. Check `cron.job_run_details` and the worker HTTP responses for scheduler failures. Do not expose either diagnostic table to clients. The temporary `innerg-discord-connection-test` function is disabled.

Do not unconditionally remove Members from everyone. There were existing legacy role holders before this integration. Review any MEE6, GateKeeper, or other automatic role assignment separately so free onboarding cannot assign the paid role.
