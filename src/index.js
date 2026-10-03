// Worker entrypoint. Static assets in public/ are served by the assets binding;
// anything that isn't a file falls through to here, where the two API routes live.
import { handleSubscribe } from './routes/subscribe.js';
import { handleConfirm } from './routes/confirm.js';

const methodNotAllowed = (allow) =>
  new Response('Method not allowed', { status: 405, headers: { Allow: allow } });

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/subscribe') {
      return request.method === 'POST'
        ? handleSubscribe(request, env)
        : methodNotAllowed('POST');
    }

    if (pathname === '/api/confirm') {
      return request.method === 'GET'
        ? handleConfirm(request, env)
        : methodNotAllowed('GET');
    }

    return env.ASSETS.fetch(request);
  },
};
