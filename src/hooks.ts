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
import type {AllowedExtensions} from './app';
import { sequence } from '@sveltejs/kit/hooks';
import {
  v5 as uuid,
  validate as validateUuid,
  version as versionUuid,
} from 'uuid';

global.atob = atob;
global.btoa = btoa;

// noinspection JSUnusedGlobalSymbols
export const handle = sequence(init, ui, images, auth, setSessionId);

function init({event, resolve}: HandleParameter): MaybePromise<Response> {
  if (!event.locals) {
    event.locals = {
      settings: {
        imageOrder: ['jxl', 'avif', 'webp', 'png'],
      },
    } as any
  }

  const cookie = event.request.headers.get('cookie') ?? '';
  const {image_order} = CookieParser.parse(cookie);

  if (image_order) {
    try {
      const imageOrder = decodeURIComponent(image_order)
        .split(',')
        .filter(ext => ['jxl', 'avif', 'webp', 'png'].includes(ext)) as AllowedExtensions[];
      event.locals.settings = {
        imageOrder,
      }
    } catch {
      // do nothing
    }
  }

  return resolve(event);
}

/** @type {import('@sveltejs/kit').Handle} */
async function ui({event, resolve}: HandleParameter): Promise<Response> {
  const cookie = event.request.headers.get('cookie') ?? '';
  const {
    theme,
    comment_folding,
    button_align,
    list_type,
  } = CookieParser.parse(cookie);

  event.locals.ui = {
    commentFolding: (comment_folding ?? 'false') === 'true',
    buttonAlign: button_align === 'left' ? 'left' : 'right',
    listType: (list_type ?? 'list') === 'list' ? 'list' : 'gallery',
  };

  const expire = dayjs().add(1000, 'year').toDate();
  const response = await resolve(event, {
    transformPageChunk: ({html}) => {
      // todo: global variable?
      const themed = theme === 'light' ? '#FFFFFF' : '#3C4556';
      return html
        .replace('<>HTML-CLASS<>', 'dark')
        .replace('<>BODY-CLASS<>', 'dark:bg-gray-600 dark:text-zinc-200 transition-colors')
        .replace('<>META-THEME-COLOR<>', themed);
    }
  });

  if (!comment_folding) {
    response.headers.append('set-cookie', `comment_folding=false; Path=/; Expires=${expire};`);
  }

  if (!button_align) {
    response.headers.append('set-cookie', `button_align=right; Path=/; Expires=${expire};`);
  }

  if (!list_type) {
    response.headers.append('set-cookie', `list_type=list; Path=/; Expires=${expire};`);
  }

  return response;
}

/** @type {import('@sveltejs/kit').Handle} */
async function images({event, resolve}: HandleParameter): Promise<Response> {

  const cookie = event.request.headers.get('cookie') ?? '';
  const {image_order} = CookieParser.parse(cookie);

  const expire = dayjs().add(1000, 'year').toDate();
  const response = await resolve(event);
  const defaultOrder = encodeURIComponent('jxl,avif,webp,png');

  if (image_order) {
    try {
      const imageOrder = decodeURIComponent(image_order)
        .split(',')
        .filter(ext => ['jxl', 'avif', 'webp', 'png'].includes(ext))
        .join(encodeURIComponent(','));

      response.headers.append('set-cookie', `image_order=${imageOrder}; Path=/; Expires=${expire};`);
    } catch {
      response.headers.append('set-cookie', `image_order=${defaultOrder}; Path=/; Expires=${expire};`);
    }
  } else {
    response.headers.append('set-cookie', `image_order=${defaultOrder}; Path=/; Expires=${expire};`);
  }

  return response;
}

/** @type {import('@sveltejs/kit').Handle} */
async function auth({event, resolve}: HandleParameter): Promise<Response> {
  let result: GetUserReturn | undefined;
  let newRefresh: njwt.Jwt | undefined;

  const cookie = event.request.headers.get('cookie') ?? '';
  const {
    token,
    refresh,
  } = CookieParser.parse(cookie);

  try {
    if (!_.isEmpty(token) || !_.isEmpty(refresh)) {
      // token이 유효할 때 혹은 token이 만료 되었지만 리프레시 토큰이 유효할 때
      // 유저 값을 반환합니다.
      result = await getUser(token, refresh);
      try {
        if (refresh) {
          const r = njwt.verify(refresh, key);
          if (r) {
            const exp = r.body.toJSON().exp as number * 1000;
            const now = Date.now();
            if (exp - 18000000 <= now) {
              const body = r.body.toJSON();
              const user = await User.findByUniqueId(body.uid as string);
              newRefresh = await user!.token('refresh');
              const expireRefresh = dayjs().add(1, 'day').toDate();
              newRefresh.setExpiration(expireRefresh);
            }
          }
        }
      } catch {
        //
      }
    }
  } catch {
    //
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

const newUuid = () => uuid('https://ru.hn', uuid.URL);
const validate = (uuid: string) => validateUuid(uuid) && versionUuid(uuid) === 5;

/** @type {import('@sveltejs/kit').Handle} */
async function setSessionId({event, resolve}: HandleParameter): Promise<Response> {
  const cookie = event.request.headers.get('cookie') ?? '';
  const {session_id,} = CookieParser.parse(cookie);
  event.locals.sessionId = session_id ?? newUuid();
  const response = await resolve(event);
  // console.log(event.locals.sessionId, !validateUuid(event.locals.sessionId))
  const isSessionUuid = validate(event.locals.sessionId);
  if (!session_id || !isSessionUuid) {
    if (!isSessionUuid) {
      event.locals.sessionId = newUuid();
    }
    const expire = dayjs().add(999, 'year').toDate().toUTCString();
    response.headers.append('set-cookie', `session_id=${event.locals.sessionId}; Path=/; Expires=${expire}; SameSite=Strict; HttpOnly;`);
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
      const {rank} = await user.safeData;
      const exp = dayjs().add(15, 'minute').toDate();
      const adult = await user.isAdult();
      const newToken = await user.token('user', {rank, adult});
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

  const body = jwt.body.toJSON();
  // console.log('check body:', body)

  if (body.iss !== 'https://ru.hn/' || body.scope !== 'user') {
    return undefined;
  }

  return { user: jwt.body.toJSON() as any };
}

interface HandleParameter {
  event: RequestEvent,
  resolve: (event: RequestEvent, opts?: ResolveOptions) => MaybePromise<Response>
}
//