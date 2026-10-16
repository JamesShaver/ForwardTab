// Shared helpers: Mailgun API, Turnstile, signed confirmation tokens.

const enc = new TextEncoder();
const dec = new TextDecoder();

const apiBase = (env) =>
  env.MAILGUN_REGION === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net';

const authHeader = (env) => ({ Authorization: 'Basic ' + btoa(`api:${env.MAILGUN_API_KEY}`) });

// ---------- Mailgun mailing list ----------

export async function getMember(env, email) {
  const url = `${apiBase(env)}/v3/lists/${env.MAILGUN_LIST}/members/${encodeURIComponent(email)}`;
  const res = await fetch(url, { headers: authHeader(env) });
  // Mailgun answers 404 both for "no such member" (expected, the common case) and for
  // "no such mailing list" (a misconfiguration). Only the former means "not subscribed yet".
  if (res.status === 404) {
    const body = await res.text();
    if (/mailing list .* not found/i.test(body)) {
      throw new Error(`Mailgun list ${env.MAILGUN_LIST} does not exist: ${body}`);
    }
    return null;
  }
  if (!res.ok) throw new Error(`Mailgun getMember ${res.status}: ${await res.text()}`);
  return (await res.json()).member; // { address, subscribed, ... }
}

export async function upsertMember(env, email, subscribed) {
  const body = new FormData();
  body.append('address', email);
  body.append('subscribed', subscribed ? 'yes' : 'no');
  body.append('upsert', 'yes');
  const res = await fetch(`${apiBase(env)}/v3/lists/${env.MAILGUN_LIST}/members`, {
    method: 'POST',
    headers: authHeader(env),
    body,
  });
  if (!res.ok) throw new Error(`Mailgun upsertMember ${res.status}: ${await res.text()}`);
}

export async function sendConfirmation(env, email, confirmUrl) {
  const body = new FormData();
  body.append('from', env.MAILGUN_FROM);
  body.append('to', email);
  body.append('subject', 'Confirm your Forward Tab pilot updates');
  body.append('text', `Confirm your subscription by opening this link:\n\n${confirmUrl}\n\nIf you didn't sign up, ignore this email.`);
  body.append('html', `<p>Confirm your subscription:</p><p><a href="${confirmUrl}">Yes, subscribe me</a></p><p>If you didn't sign up, ignore this email.</p>`);
  const res = await fetch(`${apiBase(env)}/v3/${env.MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: authHeader(env),
    body,
  });
  if (!res.ok) throw new Error(`Mailgun send ${res.status}: ${await res.text()}`);
}

// ---------- Cloudflare Turnstile ----------

// Canonical siteverify: success + the surface's action + an allowlisted frontend hostname.
// TURNSTILE_HOSTNAMES is a comma-separated allowlist and is deployment-specific — a production
// deployment must never list localhost or 127.0.0.1. Fails closed if it or the secret is missing.
export async function verifyTurnstile(env, token, ip, expectedAction) {
  const expectedHostnames = new Set(
    (env.TURNSTILE_HOSTNAMES ?? '').split(',').map((hostname) => hostname.trim()).filter(Boolean),
  );

  if (!env.TURNSTILE_SECRET || expectedHostnames.size === 0) {
    console.error('Turnstile is not configured: set TURNSTILE_SECRET and TURNSTILE_HOSTNAMES.');
    return false;
  }
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return false;

  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  if (ip) body.set('remoteip', ip);

  let result;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body,
    });
    if (!res.ok) throw new Error(`siteverify ${res.status}`);
    result = await res.json();
  } catch (err) {
    console.error('Turnstile siteverify failed:', err);
    return false;
  }

  if (!result.success) console.error('Turnstile rejected the token:', result['error-codes']);
  return result.success === true
    && result.action === expectedAction
    && expectedHostnames.has(result.hostname);
}

// ---------- Signed, expiring confirmation tokens (HMAC-SHA256) ----------

const toB64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromB64url = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

const hmacKey = (secret) =>
  crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

export async function makeToken(env, email, ttlHours = 48) {
  const exp = Math.floor(Date.now() / 1000) + ttlHours * 3600;
  const payload = toB64url(enc.encode(`${email}|${exp}`));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env.CONFIRM_SECRET), enc.encode(payload));
  return `${payload}.${toB64url(sig)}`;
}

export async function readToken(env, token) {
  const [payload, sig] = (token || '').split('.');
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(env.CONFIRM_SECRET), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const [email, exp] = dec.decode(fromB64url(payload)).split('|');
    if (Math.floor(Date.now() / 1000) > Number(exp)) return null;
    return email;
  } catch {
    return null;
  }
}
