import type {RequestEvent} from '@sveltejs/kit';
import {error, json} from '@sveltejs/kit';
import got from 'got';
import HttpStatus from 'http-status-codes';
import {env} from 'process';
import {EUserRanks} from '$lib/types/user-ranks';

interface RequestBody {
  name: string;
}

// request upload url
export async function POST({request, locals: {user}}: RequestEvent): Promise<Response> {
  if (!user || user.rank < EUserRanks.User) {
    return new Response(undefined, {status: HttpStatus.UNAUTHORIZED});
  }

  const {
    CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_STREAM_KEY,
    CLOUDFLARE_USER_ENDPOINT,
  } = env;

  if (!CLOUDFLARE_STREAM_KEY || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_USER_ENDPOINT) {
    throw error(HttpStatus.BAD_GATEWAY, `cloudflare stream not set ${!CLOUDFLARE_STREAM_KEY} ${!CLOUDFLARE_ACCOUNT_ID} ${!CLOUDFLARE_USER_ENDPOINT}`);
  }

  const r = await got.post(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`, {
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_STREAM_KEY}`,
    },
    json: {
      maxDurationSeconds: 600,
      creator: user.uid,
      //*
      allowedOrigins: env.IS_DEV ? [] : [ 'ru.hn', ], // */
    },
  }).json<object>();

  return json({...r, endpoint: CLOUDFLARE_USER_ENDPOINT});
}