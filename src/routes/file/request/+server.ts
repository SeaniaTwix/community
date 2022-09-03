import {error, json} from '$lib/kit';
import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {nanoid} from 'nanoid';
import {S3} from '$lib/file/s3';

export async function POST({locals, url}: RequestEvent): Promise<Response> {
  const type = url.searchParams.get('type');
  if (!type) {
    throw error(HttpStatus.BAD_GATEWAY, 'type is require');
  }

  if (!locals.user) {
    throw error(HttpStatus.UNAUTHORIZED, 'please login and try again');
  }

  const randomId = nanoid(32);
  const prefix = `uu/${locals.user.uid}/${randomId}/`; // .${type.split('/')[1]}`;

  // throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
  // Suggestion (check for correctness before using):
  // return new Response({
  // // uploadUrl,
  // bucket: process.env.BUCKET_NAME,
  // prefix,
  // presigned: S3.newUploadLink(prefix, type),
  return json({
    // uploadUrl,
    bucket: process.env.BUCKET_NAME,
    prefix,
    presigned: S3.newUploadLink(prefix, type),
  }, {status: HttpStatus.CREATED});
}

