import type {
  RequestEvent,
  RequestHandler,
} from "@sveltejs/kit";
import HttpStatus from 'http-status-codes';
import type {User} from '$lib/auth/user/server';
import dayjs from 'dayjs';
import {error} from '@sveltejs/kit';

// deprecated
export const POST: RequestHandler = async ({request}: RequestEvent): Promise<Response> => {
  throw error(HttpStatus.GONE, 'DEPRECATED');
};

export const DELETE: RequestHandler = async ({cookies}): Promise<Response> => {
  cookies.set('token', '', {
    maxAge: 0,
  });
  cookies.set('refresh', '', {
    maxAge: 0,
  });
  return new Response(undefined, {status: HttpStatus.ACCEPTED});
}

export async function newLoginHeaders(user: User) {
  const token = await user.token('user', {
    rank: await user.rank, adult: await user.isAdult(),
  });
  const expire = dayjs().add(10, 'minute').toDate();
  token.setExpiration(expire);

  const refresh = await user.token('refresh');
  const expireRefresh = dayjs().add(1, 'day').toDate();
  refresh.setExpiration(expireRefresh);

  const headers = new Headers();
  headers.append('Set-Cookie',
    `token=${token.compact()}; Path=/; Expires=${expire.toUTCString()}; SameSite=Strict; HttpOnly;`);
  headers.append('Set-Cookie',
    `refresh=${refresh.compact()}; Path=/; Expires=${expireRefresh.toUTCString()}; SameSite=Strict; HttpOnly;`);

  return {token, headers};
}

function newLogoutHeader() {
  const rightNow = dayjs().toDate().toUTCString();

  const headers = new Headers();
  headers.append('Set-Cookie',
    `token=; Path=/; Expires=${rightNow}; SameSite=Strict; HttpOnly;`);
  headers.append('Set-Cookie',
    `refresh=; Path=/; Expires=${rightNow}; SameSite=Strict; HttpOnly;`);

  return headers;
}
