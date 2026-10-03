// GET /api/confirm?token=... — verifies the signed token and marks the member subscribed.
import { readToken, upsertMember } from '../../lib/mailgun.js';
import { resolve } from '../../lib/env.js';

const NEEDS = [
  'MAILGUN_API_KEY', 'MAILGUN_DOMAIN', 'MAILGUN_LIST', 'MAILGUN_REGION',
  'CONFIRM_SECRET', 'SITE_URL',
];

export async function handleConfirm(request, env) {
  const cfg = await resolve(env, NEEDS);

  const missing = NEEDS.filter((name) => !cfg[name]);
  if (missing.length) {
    console.error('Missing configuration:', missing.join(', ')); // names only, never values
    return new Response('Confirmation is temporarily unavailable.', { status: 503 });
  }

  const token = new URL(request.url).searchParams.get('token');
  const email = await readToken(cfg, token);
  if (!email) return Response.redirect(`${cfg.SITE_URL}/?subscribe=expired`, 303);

  try {
    await upsertMember(cfg, email, true);
    return Response.redirect(`${cfg.SITE_URL}/?subscribe=confirmed`, 303);
  } catch (err) {
    console.error(err);
    return Response.redirect(`${cfg.SITE_URL}/?subscribe=error`, 303);
  }
}
