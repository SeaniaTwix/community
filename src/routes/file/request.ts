import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {nanoid} from 'nanoid';
import {S3} from '$lib/file/s3';

export async function POST({locals, url}: RequestEvent): Promise<RequestHandlerOutput> {
  const type = url.searchParams.get('type');
  if (!type) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: 'type is require',
      },
    };
  }

  if (!locals.user) {
    return {
      status: HttpStatus.UNAUTHORIZED,
      body: {
        reason: 'please login and try again',
      },
    };
  }

  const randomId = nanoid(32);
  const prefix = `uu/${locals.user.uid}/${randomId}/`; // .${type.split('/')[1]}`;

  return {
    status: HttpStatus.CREATED,
    body: {
      // uploadUrl,
      bucket: process.env.BUCKET_NAME,
      prefix,
      presigned: S3.newUploadLink(prefix, type),
    } as any,
  };
}

