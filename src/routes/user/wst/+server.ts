import { json } from '@sveltejs/kit';
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {dayjs} from 'dayjs';

export async function GET({locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const user = await User.findByUniqueId(locals?.user?.uid);
  if (!user) {
    return new Response(undefined, { status: HttpStatus.UNAUTHORIZED });
  }

  const token = await user.token('ws', {adult: await user.isAdult()});
  const expireRefresh = dayjs().add(1, 'day').toDate();
  token.setExpiration(expireRefresh);

  return json({
  token: token.compact(),
}, {
    status: HttpStatus.OK
  });

}