import type {RequestEvent, ResolveOptions} from '@sveltejs/kit';
import type {MaybePromise} from '@sveltejs/kit/types/private';
import _ from 'lodash-es';
import njwt from 'njwt';
import {CookieParser} from '$lib/cookie-parser';
import {key} from '$lib/auth/user/shared';
import {atob, btoa} from 'js-base64';
import {User} from '$lib/auth/user/server';
import {dayjs} from 'dayjs';
import type {JwtUser} from '$lib/types/user';

global.atob = atob;
global.btoa = btoa;

// noinspection JSUnusedLocalSymbols
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({event, resolve}: HandleParameter): Promise<Response> {
  let result: GetUserReturn | undefined;
  let newRefresh: njwt.Jwt | undefined;

  const cookie = event.request.headers.get('cookie') ?? '';
  const {comment_folding, button_align} = (new CookieParser(cookie!)).get();
  event.locals.commentFolding = (comment_folding ?? 'false') === 'true';
  event.locals.buttonAlign = button_align === 'left' ? 'left' : 'right';

  try {
    const cookie = event.request.headers.get('cookie');
    if (!_.isEmpty(cookie)) {
      const {token, refresh} = (new CookieParser(cookie!)).get();

      // token이 유효할 때 혹은 token이 만료 되었지만 리프레시 토큰이 유효할 때
      // 유저 값을 반환합니다.
      result = await getUser(token, refresh);
      // extends refresh
      try {
        if (refresh) {
          const r = njwt.verify(refresh, key);
          if (r) {
            const exp = r.body.toJSON().exp as number * 1000;
            const now = Date.now();
            // console.log('limit:', exp - 18000000, ' now: ', now, exp - 18000000 <= now, (exp - 18000000 - now) / 1000 / 60 / 60);
            if (exp - 18000000 <= now) {
              const user = new User(r.body.toJSON().uid as string);
              newRefresh = user.token('refresh');
              const expireRefresh = dayjs().add(1, 'day').toDate();
              newRefresh.setExpiration(expireRefresh);
            }
          }
        }
      } catch {
        //
      }
    }
  } catch (e) {
    // console.error('[hooks]', event.request.headers.get('cookie'), e);
  }

  if (result?.newToken) {
    event.locals.user = result.user;

    const response = await resolve(event);
    const expire = dayjs().add(15, 'minute').toDate().toUTCString();
    response.headers.append('set-cookie', `token=${result.newToken}; Path=/; Expires=${expire}; SameSite=Strict; HttpOnly;`);
    if (newRefresh) {
      const expireRefresh = dayjs().add(1, 'day').toDate();
      response.headers.append('set-cookie', `refresh=${newRefresh.compact()}; Path=/; Expires=${expireRefresh.toUTCString()}; SameSite=Strict; HttpOnly;`);
    }
    return response;
  }

  if (!result) {
    // noinspection ES6RedundantAwait
    return await resolve(event);
  }

  event.locals.user = result.user;

  const response = await resolve(event);

  try {
    if (result?.newToken) {
      response.headers.append('set-cookie', result.newToken);
    }
  } catch {
    console.trace('error');
  }

  return response;
}

async function refreshJwt(token: string) {
  try {
    const refresh = njwt.verify(token ?? '', key);
    if (refresh?.isExpired() === false) {
      // todo: sign again
      const {sub} = refresh.body.toJSON() as { sub: string };
      const id = sub.split('/')[1];
      const user = new User(id);
      const {_key, rank} = await user.safeData;
      const exp = dayjs().add(15, 'minute').toDate();
      const adult = await user.isAdult();
      const newToken = await user.token('user', {uid: _key, rank, adult});
      newToken.setExpiration(exp);
      return {newToken: newToken.compact(), user: newToken.body.toJSON()};
    }
  } catch {
    //
  }

  return undefined;
}

type GetUserReturn = { user: JwtUser & {adult: boolean}, newToken?: string };
async function getUser(token?: string, refresh?: string): Promise<GetUserReturn | undefined> {

  if (!token) {
    if (refresh) {
      try {
        return await refreshJwt(refresh) as any
      } catch (e) {
        console.error(e)
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

  return { user: jwt.body.toJSON() as any };
}

/** @type {import('@sveltejs/kit').GetSession} */
export function getSession(event: RequestEvent) {
  return {
    user: event.locals.user,
    commentFolding: event.locals.commentFolding,
    buttonAlign: event.locals.buttonAlign,
  };
}

interface HandleParameter {
  event: RequestEvent,
  resolve: (event: RequestEvent, opts?: ResolveOptions) => MaybePromise<Response>
}
//