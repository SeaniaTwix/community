import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import got from 'got';
import {ImageConverter} from '$lib/file/image/converter';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {EUserRanks} from '$lib/types/user-ranks';

export async function POST({locals, request}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user || locals.user.rank <= EUserRanks.Banned) {
    return {
      status: HttpStatus.UNAUTHORIZED,
    };
  }

  const {src} = await request.json() as { src: string };

  const s3Url = `https://${process.env.S3_ENDPOINT}`;

  if (!src.startsWith(s3Url)) {
    return {
      status: HttpStatus.BAD_REQUEST,
      body: {
        reason: 'only allowed from s3 endpoint',
      },
    };
  }

  const base = new RegExp(`^${s3Url}(/.+)`);

  if (!base.test(src)) {
    return {
      status: HttpStatus.BAD_GATEWAY,
    };
  }

  const basePath = ImageConverter.getBasePath(src);

  const cursor = await db.query(aql`
    for image in images
      filter image.src == ${basePath}
        return image.converted`);

  const imageExists = cursor.hasNext;

  if (imageExists && locals.user.rank <= EUserRanks.User) {
    const converted = await cursor.next() as string[];
    if (converted.length >= 4) {
      return {
        status: HttpStatus.CONFLICT,
        body: {
          reason: `src is already registerd`,
          src: basePath,
        },
      };
    }
  }

  const info = await got.head(src);
  if (info.statusCode !== HttpStatus.OK) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {reason: `src link returns ${info.statusCode}`},
    };
  }

  const isRequestDone = await ImageConverter.saveAll(src, imageExists);

  return {
    status: HttpStatus.ACCEPTED,
    body: {
      ok: isRequestDone,
    }
  };
}