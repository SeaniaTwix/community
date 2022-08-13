import got from 'got';
import {isEmpty} from 'lodash-es';

export async function purge(files: string[]) {
  const zone = process.env.CLOUDFLARE_ZONE;
  if (isEmpty(zone)) {
    throw new Error('$CLOUDFLARE_ZONE is not set');
  }
  const key = process.env.CLOUDFLARE_PURGE_KEY;
  if (isEmpty(key)) {
    throw new Error('$CLOUDFLARE_PURGE_KEY is not set');
  }
  await got.post(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
    headers: {
      Authorization: `Bearer ${key}`,
    },
    json: {
      files,
    }
  });
}