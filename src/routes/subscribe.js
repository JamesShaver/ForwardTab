// POST /api/subscribe — validates, checks Turnstile, adds pending member, sends confirm email.
import { getMember, upsertMember, sendConfirmation, verifyTurnstile, makeToken } from '../../lib/mailgun.js';
import { resolve } from '../../lib/env.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TURNSTILE_ACTION = 'signup'; // must match data-action on the widget in public/index.html

const NEEDS = [
  'MAILGUN_API_KEY', 'MAILGUN_DOMAIN', 'MAILGUN_LIST', 'MAILGUN_FROM', 'MAILGUN_REGION',
  'TURNSTILE_SECRET', 'TURNSTILE_HOSTNAMES', 'CONFIRM_SECRET', 'SITE_URL',
];

export async function handleSubscribe(request, env) {
  const cfg = await resolve(env, NEEDS);

  // Without SITE_URL there is no redirect target, so answer in JSON regardless.
  const wantsJson =
    (request.headers.get('Accept') || '').includes('application/json') || !cfg.SITE_URL;
  const respond = (status, code, message) =>
    wantsJson
      ? Response.json({ ok: status < 400, code, message }, { status })
      : Response.redirect(`${cfg.SITE_URL}/?subscribe=${code}`, 303);

  const missing = NEEDS.filter((name) => !cfg[name]);
  if (missing.length) {
    console.error('Missing configuration:', missing.join(', ')); // names only, never values
    return respond(503, 'error', 'Signup is temporarily unavailable.');
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return respond(400, 'invalid', 'Send the form as form data.');
  }

  // Honeypot: bots fill hidden fields. Pretend success.
  if (form.get('website')) return respond(200, 'pending', 'Check your inbox to confirm.');

  const email = String(form.get('email') || '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return respond(400, 'invalid', 'Enter a valid email address.');
  }

  const ip = request.headers.get('CF-Connecting-IP');
  if (!(await verifyTurnstile(cfg, form.get('cf-turnstile-response'), ip, TURNSTILE_ACTION))) {
    return respond(403, 'challenge', 'Verification failed. Reload the page and try again.');
  }

  try {
    const existing = await getMember(cfg, email);
    // Same response whether or not they're already on the list (no address enumeration).
    if (existing?.subscribed) return respond(200, 'pending', 'Check your inbox to confirm.');

    if (!existing) await upsertMember(cfg, email, false);

    const token = await makeToken(cfg, email);
    await sendConfirmation(cfg, email, `${cfg.SITE_URL}/api/confirm?token=${token}`);

    return respond(200, 'pending', 'Check your inbox to confirm.');
  } catch (err) {
    // 503, not 502: this is our upstream (Mailgun) being unavailable or misconfigured,
    // and a 502 is indistinguishable in the browser from the edge failing to reach us.
    console.error(err);
    return respond(503, 'error', 'Subscription failed. Try again in a few minutes.');
  }
}
