import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';

export async function get({locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return {
      status: HttpStatus.UNAUTHORIZED,
      body: {
        reason: 'no session',
      }
    }
  }

  const user = new User(locals.user.uid);

  return {
    status: 200,
    body: {
      id: user.id,
    }
  }
}