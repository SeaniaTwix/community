import {json} from '$lib/kit';
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {User} from '$lib/auth/user/server';

export async function GET({locals, url: {searchParams}}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return new Response(undefined, {status: HttpStatus.UNAUTHORIZED});
  }

  const user = await User.findByUniqueId(locals?.user?.uid);

  if (typeof searchParams.get('exists') === 'string') {
    const unread = await user?.getAllUnreadNotifications(1);
    const count = unread?.length ?? 0;
    return json({
      unread: count > 0,
    }, {
      status: HttpStatus.OK,
    });
  }

  const unread = await user?.getAllUnreadNotifications(10);

  if (!unread) {
    return json({
      reason: `${locals?.user?.uid} is not a user`,
    }, {
      status: HttpStatus.BAD_GATEWAY,
    });
  }

  return json({
    unread,
  });
}
