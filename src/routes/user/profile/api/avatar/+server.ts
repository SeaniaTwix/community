import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {S3} from '$lib/file/s3';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {isEmpty} from 'lodash-es';
import {purge} from '$lib/file/cloudflare';
import {nanoid} from 'nanoid';
import {error} from '$lib/kit';

// get link for upload to s3
export async function GET({locals}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    throw error(HttpStatus.UNAUTHORIZED, 'please login and try again');
  }

  return json({
    ...S3.newAvatarUploadLink(locals.user.uid),
  });
}

// save uploaded url
export async function POST({locals, request}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    throw error(HttpStatus.UNAUTHORIZED, 'please login and try again');
  }

  const {link} = await request.json() as { link: string };

  if (isEmpty(link)) {
    throw error(HttpStatus.BAD_REQUEST, 'link is required');
  }

  if (!(new RegExp(`^https://s3.ru.hn/avatar/${locals.user.uid}.`)).test(link)) {
    throw error(HttpStatus.NOT_ACCEPTABLE, 'avatar url seems to be invalid');
  }

  try {
    await db.query(aql`
      for user in users
        filter user._key == ${locals.user.uid}
          update user with {avatar: ${link + '?v=' + nanoid(4)}} in users`);

    purge([link]).then().catch();
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }

  return new Response(undefined, {status: HttpStatus.ACCEPTED});
}