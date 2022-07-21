import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {S3} from '$lib/file/s3';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {isEmpty} from 'lodash-es';

// get link
export async function GET({locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return {
      status: HttpStatus.UNAUTHORIZED,
      body: {
        reason: 'please login and try again',
      },
    };
  }

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
    return {
      status: HttpStatus.UNAUTHORIZED,
      body: {
        reason: 'please login and try again',
      },
    };
  }

  try {
    const {link} = await request.json() as { link: string };

    if (isEmpty(link)) {
      return {
        status: HttpStatus.NOT_ACCEPTABLE,
        body: {
          reason: 'link is required',
        },
      };
    }

    if (!(new RegExp(`^https://s3.ru.hn/avatar/${locals.user.uid}.`)).test(link)) {
      return {
        status: HttpStatus.NOT_ACCEPTABLE,
        body: {
          reason: 'avatar url seems to be invalid',
        },
      };
    }

    await db.query(aql`
      for user in users
        filter user._key == ${locals.user.uid}
          update user with {avatar: ${link}} in users`);
  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString(),
      },
    };
  }

  return {
    status: HttpStatus.ACCEPTED,
  }
}