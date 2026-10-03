// POST /api/subscribe — validates, checks Turnstile, adds pending member, sends confirm email.
import { getMember, upsertMember, sendConfirmation, verifyTurnstile, makeToken } from '../../lib/mailgun.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TURNSTILE_ACTION = 'signup'; // must match data-action on the widget in public/index.html

export async function onRequestPost({ request, env }) {
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
  const respond = (status, code, message) =>
    wantsJson
      ? Response.json({ ok: status < 400, code, message }, { status })
      : Response.redirect(`${env.SITE_URL}/?subscribe=${code}`, 303);

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
  if (!(await verifyTurnstile(env, form.get('cf-turnstile-response'), ip, TURNSTILE_ACTION))) {
    return respond(403, 'challenge', 'Verification failed. Reload the page and try again.');
  }

  try {
    const existing = await getMember(env, email);
    // Same response whether or not they're already on the list (no address enumeration).
    if (existing?.subscribed) return respond(200, 'pending', 'Check your inbox to confirm.');

    if (!existing) await upsertMember(env, email, false);

    const token = await makeToken(env, email);
    await sendConfirmation(env, email, `${env.SITE_URL}/api/confirm?token=${token}`);

    return respond(200, 'pending', 'Check your inbox to confirm.');
  } catch (err) {
    console.error(err);
    return respond(502, 'error', 'Subscription failed. Try again in a few minutes.');
  }
}

export const onRequest = () =>
  new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
