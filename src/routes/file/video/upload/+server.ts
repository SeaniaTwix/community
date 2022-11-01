import type {RequestEvent} from '@sveltejs/kit';
import got from 'got';
import HttpStatus from 'http-status-codes';
import {env} from 'process';
import {json} from '@sveltejs/kit';

// request upload url
export async function POST({request, locals: {user}}: RequestEvent): Promise<Response> {
  if (!user) {
    return new Response(undefined, {status: HttpStatus.UNAUTHORIZED});
  }

  const CLOUDFLARE_ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
  const r = await got.post(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`, {
    headers: {
      Authorization: ``
    },
    json: {
      maxDurationSeconds: 3600,
      allowedOrigins: [
        'ru.hn'
      ]
    },
  }).json();

  return json(r);
}