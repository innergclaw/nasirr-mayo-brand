# Watchlist on Home Base

Public route: https://nasirr.innergintel.org/watchlist/

The source of the interface remains innergclaw/innerg-watchlist. Run `node automation/sync-watchlist.mjs` to refresh the ten allowlisted public files. The hourly Sync Market Pulse interface workflow performs the same sync and requests a Pages build when files change. Do not edit mirrored files directly.

Prices load from the existing public snapshot endpoint on every page refresh. Existing price and news schedules stay in their original repository; no duplicate market collector is created. Private research is never copied here. The existing member-research service validates membership and permits this origin.

Google sign-in uses /account/?next=%2Fwatchlist%2F. The account destination allowlist permits only the fixed /watchlist/ route. Email-code sign-in remains embedded in the watchlist. Both use the existing Supabase project and the same origin storage as the member hub.

The old GitHub Pages URL stays available for existing links. New Home Base and member navigation links use /watchlist/.

Checks: `node --test watchlist-route.test.mjs account/auth-flow.test.mjs home-clarity.test.mjs innergid/section-nav.test.mjs`.
