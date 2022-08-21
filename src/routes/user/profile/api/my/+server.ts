import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {CookieParser} from '$lib/cookie-parser';
import njwt from 'njwt';
import {key} from '$lib/auth/user/shared';

export async function GET({request, locals, url}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return {
      status: HttpStatus.UNAUTHORIZED,
      body: {
        reason: 'no session',
      },
    };
  }

  const user = new User(locals.user.sub.split('/')[1]);

  if (!await user.exists) {
    return {
      status: HttpStatus.UNAUTHORIZED,
      body: {
        reason: 'no session',
      },
    };
  }

  const cookies = (new CookieParser(request.headers.get('cookie') ?? '')).get();
  if (cookies.token) {
    return {
      status: HttpStatus.OK,
      body: {
        user: {
          ...njwt.verify(cookies.token, key)?.body.toJSON(),
          adult: await user.isAdult(),
        },
      },
    };
  }

  return {
    status: 200,
    body: {
      id: user.id,
    },
  };
}