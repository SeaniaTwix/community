import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';

export async function get({url}: RequestEvent): Promise<RequestHandlerOutput> {
  const id = url.searchParams.get('id');
  if (!id) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: 'id invalid'
      }
    }
  }

  const user = await User.findByUniqueId(id);
  if (!user || !await user.exists) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: 'id invalid'
      }
    }
  }

  const userData = await user.safeData;

  return {
    status: 200,
    body: {
      user: userData as any,
    }
  }
}
