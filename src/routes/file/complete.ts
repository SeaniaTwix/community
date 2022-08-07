import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import got from 'got';
import {ImageConverter} from '$lib/file/image/converter';
import db from '$lib/database/instance';
import {aql} from 'arangojs';

export async function POST({locals, request}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
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
        return image`);

  if (cursor.hasNext) {
    return {
      status: HttpStatus.CONFLICT,
      body: {
        reason: `src is already registerd`,
        src: basePath,
      },
    };
  }

  const info = await got.head(src);
  if (info.statusCode !== HttpStatus.OK) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {reason: `src link returns ${info.statusCode}`},
    };
  }

  const isRequestDone = await ImageConverter.saveAll(src);

  return {
    status: HttpStatus.ACCEPTED,
    body: {
      ok: isRequestDone,
    }
  };
}