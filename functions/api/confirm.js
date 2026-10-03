// GET /api/confirm?token=... — verifies the signed token and marks the member subscribed.
import { readToken, upsertMember } from '../../lib/mailgun.js';

export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get('token');
  const email = await readToken(env, token);
  if (!email) return Response.redirect(`${env.SITE_URL}/?subscribe=expired`, 303);

  try {
    await upsertMember(env, email, true);
    return Response.redirect(`${env.SITE_URL}/?subscribe=confirmed`, 303);
  } catch (err) {
    console.error(err);
    return Response.redirect(`${env.SITE_URL}/?subscribe=error`, 303);
  }
}
