import type {RequestEvent, ResolveOptions} from '@sveltejs/kit';
import type {MaybePromise} from '@sveltejs/kit/types/private';
import _ from 'lodash-es';
import njwt from 'njwt';
import {CookieParser} from '$lib/cookie-parser';
import {key} from '$lib/auth/user/shared';
import type {EUserRanks} from '$lib/types/user-ranks';
import {atob, btoa} from 'js-base64';
import {User} from './lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {dayjs} from 'dayjs';

global.atob = atob;
global.btoa = btoa;

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({event, resolve}: HandleParameter) {
  let result: GetUserReturn | undefined;
  try {
    result = await getUser(event.request.headers.get('cookie'));
    console.log('user data:', result);
    if (result?.newToken) {
      const response = await resolve(event);
      const expire = dayjs().add(15, 'minute').toDate().toUTCString();
      response.headers.append('set-cookie', `token=${result.newToken}; Path=/; Expires=${expire}; SameSite=Strict; HttpOnly;`);

      event.locals.user = result.user;
      return response;
    }
  } catch (e) {
    // console.error('[hooks]', event.request.headers.get('cookie'), e);
  }
  if (!result) {
    const response = await resolve(event);
    const expireNow = dayjs().toDate().toUTCString();
    response.headers.append('set-cookie', `token=; Path=/; Expires=${expireNow}; SameSite=Strict; HttpOnly;`);
    response.headers.append('set-cookie', `refesh=; Path=/; Expires=${expireNow}; SameSite=Strict; HttpOnly;`);
    return response;
  }
  event.locals.user = result.user;

  const response = await resolve(event);

  try {
    if (result?.newToken) {
      response.headers.set('set-cookie', result.newToken);
    }
  } catch {
    console.trace('error');
  }

  return response;
}

async function refreshJwt(token: string) {
  const refresh = njwt.verify(token ?? '', key);
  // console.log(refresh)
  if (refresh?.isExpired() === false) {
    // todo: sign again
    const {uid} = refresh.body.toJSON();
    const user = new User(<string>uid);
    const newToken = await user.token('user', {uid, rank: await user.rank});
    return { newToken: newToken.compact(), user: newToken.body.toJSON() };
  }

  return undefined;
}

type GetUserReturn = { user: Rec<any>, newToken?: string };
async function getUser(cookie: string | null): Promise<GetUserReturn | undefined> {
  if (_.isEmpty(cookie)) {
    return undefined;
  }

  const {token, refresh} = (new CookieParser(cookie!)).get();
  if (!token) {
    if (refresh) {
      // console.log('refresh', refresh)
      try {
        return await refreshJwt(refresh)
      } catch {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  const jwt = njwt.verify(token!, key);
  if (!jwt) {
    return undefined;
  }

  return { user: jwt.body.toJSON() as Rec<any> };
  // console.log(body)
}

/** @type {import('@sveltejs/kit').GetSession} */
export function getSession(event: RequestEvent) {
  return event.locals.user;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace App {
    interface Locals {
      user: any;
    }

    interface Session {
      uid: string;
      rank: EUserRanks;
    }
  }
}

interface HandleParameter {
  event: RequestEvent,
  resolve: (event: RequestEvent, opts?: ResolveOptions) => MaybePromise<Response>
}