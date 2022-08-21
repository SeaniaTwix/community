import { json as json$1 } from '@sveltejs/kit';
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {S3} from '$lib/file/s3';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {isEmpty} from 'lodash-es';
import {purge} from '$lib/file/cloudflare';
import {nanoid} from 'nanoid';

// get link
export async function GET({locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return json$1({
  reason: 'please login and try again',
}, {
      status: HttpStatus.UNAUTHORIZED
    });
  }

  throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
  // Suggestion (check for correctness before using):
  // return new Response({
  // ...S3.newAvatarUploadLink(locals.user.uid),
} as any, { status: HttpStatus.CREATED });
  return {
    status: HttpStatus.CREATED,
    body: {
      ...S3.newAvatarUploadLink(locals.user.uid),
    } as any,
  };
}

// save uploaded url
export async function POST({locals, request}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return json$1({
  reason: 'please login and try again',
}, {
      status: HttpStatus.UNAUTHORIZED
    });
  }

  try {
    const {link} = await request.json() as { link: string };

    if (isEmpty(link)) {
      return json$1({
  reason: 'link is required',
}, {
        status: HttpStatus.NOT_ACCEPTABLE
      });
    }

    if (!(new RegExp(`^https://s3.ru.hn/avatar/${locals.user.uid}.`)).test(link)) {
      return json$1({
  reason: 'avatar url seems to be invalid',
}, {
        status: HttpStatus.NOT_ACCEPTABLE
      });
    }

    await db.query(aql`
      for user in users
        filter user._key == ${locals.user.uid}
          update user with {avatar: ${link + '?v=' + nanoid(4)}} in users`);

    purge([link]).then().catch();
  } catch (e: any) {
    return json$1({
  reason: e.toString(),
}, {
      status: HttpStatus.BAD_GATEWAY
    });
  }

  return new Response(undefined, { status: HttpStatus.ACCEPTED })
}