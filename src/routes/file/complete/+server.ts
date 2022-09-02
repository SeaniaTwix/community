import {json} from '$lib/kit';
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import got from 'got';
import {ImageConverter} from '$lib/file/image/converter';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {EUserRanks} from '$lib/types/user-ranks';

export async function POST({locals, request}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user || locals.user.rank <= EUserRanks.Banned) {
    return new Response(undefined, {status: HttpStatus.UNAUTHORIZED});
  }

  const {src} = await request.json() as { src: string };

  const s3Url = `https://${process.env.S3_ENDPOINT}`;

  if (!src.startsWith(s3Url)) {
    return json({
      reason: 'only allowed from s3 endpoint',
    }, {
      status: HttpStatus.BAD_REQUEST,
    });
  }

  const base = new RegExp(`^${s3Url}(/.+)`);

  if (!base.test(src)) {
    return new Response(undefined, {status: HttpStatus.BAD_GATEWAY});
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
      return json({
        reason: `src is already registerd`,
        src: basePath,
      }, {
        status: HttpStatus.CONFLICT,
      });
    }
  }

  const info = await got.head(src);
  if (info.statusCode !== HttpStatus.OK) {
    return json({reason: `src link returns ${info.statusCode}`}, {
      status: HttpStatus.BAD_GATEWAY,
    });
  }

  const isRequestDone = await ImageConverter.saveAll(src, imageExists);

  return json({
    ok: isRequestDone,
  }, {
    status: HttpStatus.ACCEPTED,
  });
}