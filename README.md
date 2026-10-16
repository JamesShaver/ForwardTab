# Cloudflare Worker + Mailgun subscribe form (double opt-in)

GitHub repo → Cloudflare Worker `forward-tab`, deployed automatically on push to `main`.

```
wrangler.jsonc        Worker config: assets binding + Secrets Store bindings
public/               static site, served by the ASSETS binding
src/index.js          entrypoint; routes /api/* and falls through to ASSETS
src/routes/*.js       the two API handlers
lib/mailgun.js        Mailgun, Turnstile siteverify, signed tokens
lib/env.js            resolves plain vars and Secrets Store bindings alike
```

This is a Worker with static assets, **not** a Pages project — a `functions/`
directory would be ignored. Routes are declared in `src/index.js`.

## Flow
1. Form POSTs to `/api/subscribe` (Turnstile + honeypot checked).
2. Email is added to the Mailgun list as `subscribed=no` and a signed 48h confirm link is sent.
3. `/api/confirm?token=…` flips the member to `subscribed=yes`.

Abuse limits (each signup costs a Mailgun send):
- **Per IP:** 5 signup requests a minute (`SUBSCRIBE_LIMITER`, the `ratelimits` binding in `wrangler.jsonc`),
  else `429`. Counted per Cloudflare location, so approximate.
- **Per address:** at most 3 confirmation emails a day, 10 minutes apart. The send times live on the Mailgun
  member (`vars.confirm_sent`); a throttled request gets the same "check your inbox" answer and no email.

## Setup
1. **Mailgun**: verify a sending domain, then create a mailing list (e.g. `updates@mg.forwardtab.org`) under Send → Mailing lists.
2. **Turnstile**: widget already created — sitekey `0x4AAAAAAFNBVp8Pm_Ym2OVk`, embedded in `public/index.html` with action `signup`. Make sure the widget's domain list in the dashboard covers every hostname you serve from (plus `localhost` / `127.0.0.1` for local dev), then copy its secret into `TURNSTILE_SECRET`.
3. **Worker**: `forward-tab`, custom domain `forwardtab.org`, connected to this repo. Pushing to `main` builds and deploys it. The assets directory and all bindings come from `wrangler.jsonc`, not the dashboard.
4. **Configuration** lives in the account-level **Secrets Store** (store `default_secrets_store`, id `5f3607153cf44382bf2913e24b6fc1d3`), each entry scoped to `workers` and bound by name in `wrangler.jsonc`. Add or rotate a value with:

   ```bash
   wrangler secrets-store secret create <store-id> --name NAME --scopes workers --remote
   ```

   All nine must be present — the handlers refuse the request and log the missing names if any is absent.

| Name | Example |
|---|---|
| `MAILGUN_API_KEY` | `key-xxxx` (secret) |
| `MAILGUN_DOMAIN` | `mg.forwardtab.org` |
| `MAILGUN_LIST` | `updates@mg.forwardtab.org` |
| `MAILGUN_FROM` | `Forward Tab <updates@mg.forwardtab.org>` |
| `MAILGUN_REGION` | `us` or `eu` |
| `TURNSTILE_SECRET` | from Turnstile (secret) |
| `TURNSTILE_HOSTNAMES` | `forwardtab.org,www.forwardtab.org` — comma-separated allowlist of hostnames the form is served from. **Never include `localhost` or `127.0.0.1` in production.** |
| `CONFIRM_SECRET` | long random string, e.g. `openssl rand -hex 32` (secret) |
| `SITE_URL` | `https://forwardtab.org` (no trailing slash) |

Adding, renaming or removing a binding means editing `wrangler.jsonc` and redeploying.
Changing only a *value* does not: `lib/env.js` calls `await env.NAME.get()` per request, so
the Worker reads the current one. Cloudflare does not document a propagation delay, so allow
a short window after rotating before assuming the new value is live.

## Local dev
```bash
wrangler dev            # reads wrangler.jsonc; serves public/ and /api/*
```
The Secrets Store is not available locally, so every value resolves to undefined and
both endpoints return 503 by design. To exercise them, put plain values in `.dev.vars`
(`KEY=value` per line, gitignored) — `lib/env.js` accepts plain strings and Secrets
Store bindings interchangeably.

Turnstile test keys for local: site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.
Set `TURNSTILE_HOSTNAMES=localhost,127.0.0.1` in `.dev.vars` and swap `TURNSTILE_SITEKEY` in `public/index.html` to the test site key while developing locally.

## Sending to the list
Send to the list address (`updates@mg.forwardtab.org`) via the Mailgun API or SMTP; only `subscribed=yes` members receive it. Include `%mailing_list_unsubscribe_url%` in the body for one-click unsubscribe.
