// Config values reach the Worker in one of two shapes:
//   * plain strings — `vars` in wrangler.jsonc, or `wrangler secret put`
//   * Secrets Store bindings — an object exposing an async `.get()`
// resolve() flattens both into a plain { NAME: string } object, so the helpers
// in mailgun.js can keep reading `env.MAILGUN_API_KEY` without caring which is
// in use. Missing values come back undefined and the callers fail closed.

async function read(binding) {
  if (binding == null) return undefined;
  if (typeof binding === 'string') return binding;
  if (typeof binding.get !== 'function') return undefined;
  try {
    // A Secrets Store binding throws if the secret is missing or unreadable;
    // callers treat undefined as "not configured" and refuse the request.
    return await binding.get();
  } catch {
    return undefined;
  }
}

export async function resolve(env, names) {
  const entries = await Promise.all(
    names.map(async (name) => [name, await read(env[name])]),
  );
  return Object.fromEntries(entries);
}
