# Cloudflare Pages + Mailgun subscribe form (double opt-in)

GitHub repo → Cloudflare Pages (static `public/`) + Pages Functions (`functions/api/*`).

## Flow
1. Form POSTs to `/api/subscribe` (Turnstile + honeypot checked).
2. Email is added to the Mailgun list as `subscribed=no` and a signed 48h confirm link is sent.
3. `/api/confirm?token=…` flips the member to `subscribed=yes`.

## Setup
1. **Mailgun**: verify a sending domain, then create a mailing list (e.g. `updates@mg.trusttab.org`) under Send → Mailing lists.
2. **Turnstile**: widget already created — sitekey `0x4AAAAAAFNBVp8Pm_Ym2OVk`, embedded in `public/index.html` with action `signup`. Make sure the widget's domain list in the dashboard covers every hostname you serve from (plus `localhost` / `127.0.0.1` for local dev), then copy its secret into `TURNSTILE_SECRET`.
3. **Cloudflare Pages**: Create project → Connect to Git → pick this repo.
   - Framework preset: None
   - Build command: (blank)
   - Build output directory: `public`
4. **Environment variables** (Settings → Variables and Secrets; mark keys as secrets):

| Name | Example |
|---|---|
| `MAILGUN_API_KEY` | `key-xxxx` (secret) |
| `MAILGUN_DOMAIN` | `mg.trusttab.org` |
| `MAILGUN_LIST` | `updates@mg.trusttab.org` |
| `MAILGUN_FROM` | `Trust Tab <updates@mg.trusttab.org>` |
| `MAILGUN_REGION` | `us` or `eu` |
| `TURNSTILE_SECRET` | from Turnstile (secret) |
| `TURNSTILE_HOSTNAMES` | `trusttab.org,www.trusttab.org` — comma-separated allowlist of hostnames the form is served from. **Never include `localhost` or `127.0.0.1` in production.** |
| `CONFIRM_SECRET` | long random string, e.g. `openssl rand -hex 32` (secret) |
| `SITE_URL` | `https://trusttab.org` (no trailing slash) |

Redeploy after adding variables.

## Local dev
```bash
npm i -g wrangler
# put the vars above in .dev.vars (KEY=value per line, gitignored)
wrangler pages dev public
```
Turnstile test keys for local: site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.
Set `TURNSTILE_HOSTNAMES=localhost,127.0.0.1` in `.dev.vars` and swap `TURNSTILE_SITEKEY` in `public/index.html` to the test site key while developing locally.

## Sending to the list
Send to the list address (`updates@mg.trusttab.org`) via the Mailgun API or SMTP; only `subscribed=yes` members receive it. Include `%mailing_list_unsubscribe_url%` in the body for one-click unsubscribe.
