import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {User} from '$lib/auth/user/server';

export async function GET({locals, url: {searchParams}}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return {
      status: HttpStatus.UNAUTHORIZED,
    };
  }

  const user = await User.findByUniqueId(locals?.user?.uid);

  if (typeof searchParams.get('exists') === 'string') {
    const unread = await user?.getAllUnreadNotifications(1);
    const count = unread?.length ?? 0;
    return {
      status: HttpStatus.OK,
      body: {
        unread: count > 0,
      },
    };
  }

  const unread = await user?.getAllUnreadNotifications(10);

  if (!unread) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: `${locals?.user?.uid} is not a user`,
      },
    };
  }

  return {
    status: HttpStatus.OK,
    body: {
      unread,
    } as any,
  };
}