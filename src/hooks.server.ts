import type {RequestEvent, ResolveOptions} from '@sveltejs/kit';
import type {MaybePromise} from '@sveltejs/kit/types/private';
import njwt, {Jwt} from 'njwt';
import {CookieParser} from '$lib/cookie-parser';
import {key} from '$lib/auth/user/shared';
import {atob, btoa} from 'js-base64';
import {User} from '$lib/auth/user/server';
import dayjs from 'dayjs';
import type {AllowedExtensions, IUserSession} from './app';
import { sequence } from '@sveltejs/kit/hooks';
// todo: 나중에 패키지로 고칠 것. 패키지에서 불러오면 undefined로 불러와짐...
import {
  v5 as uuid,
  validate as validateUuid,
  version as versionUuid,
} from '$lib/uuid/esm-node';
import {env} from 'node:process';
import {isEmpty} from 'lodash-es';
import {Permissions} from '$lib/community/permission';

global.atob = atob;
global.btoa = btoa;

// noinspection JSUnusedGlobalSymbols
export const handle = sequence(init, ui, images, auth, setSessionId, setPermissions);

function init({event, resolve}: HandleParameters): MaybePromise<Response> {
  if (!event.locals) {
    event.locals = {
      settings: {
        imageOrder: ['jxl', 'avif', 'webp', 'png'],
      },
    } as any
  }

  const image_order = event.cookies.get('image_order');

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
function ui({event, resolve}: HandleParameters): MaybePromise<Response> {
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

  const expire = dayjs().add(1000, 'y').toDate();
  const validTheme = theme === 'light' ? 'light' : 'dark';

  if (!comment_folding) {
    // response.headers.append('set-cookie', `comment_folding=false; Path=/; Expires=${expire};`);
    event.cookies.set('comment_folding', event.locals.ui.commentFolding.toString(), {
      path: '/',
      expires: expire,
      httpOnly: false,
    });
  }

  if (!button_align) {
    // response.headers.append('set-cookie', `button_align=right; Path=/; Expires=${expire};`);
    event.cookies.set('button_align', event.locals.ui.buttonAlign, {
      path: '/',
      expires: expire,
      httpOnly: false,
    });
  }

  if (!list_type) {
    // response.headers.append('set-cookie', `list_type=list; Path=/; Expires=${expire};`);
    event.cookies.set('list_type', event.locals.ui.listType, {
      path: '/',
      expires: expire,
      httpOnly: false,
    });
  }

  // response.headers.append('set-cookie', `theme=${validTheme}; Path=/; Expires=${expire};`);
  event.cookies.set('theme', validTheme, {
    path: '/',
    expires: expire,
    httpOnly: false,
  });

  return resolve(event, {
    transformPageChunk: ({html}) => {
      // todo: global variable?
      const themed = theme === 'light' ? '#FFFFFF' : '#3C4556';
      // console.log(themed)
      return html
        .replace('<>HTML-CLASS<>', theme === 'light' ? '' : 'dark')
        .replace('<>BODY-CLASS<>', 'dark:bg-gray-600 dark:text-zinc-200 transition-colors')
        .replace('<>META-THEME-COLOR<>', themed);
    }
  });
}

/** @type {import('@sveltejs/kit').Handle} */
function images({event, resolve}: HandleParameters): MaybePromise<Response> {
  const image_order = event.cookies.get('image_order');

  const expire = dayjs().add(1000, 'year').toDate();
  const defaultOrder = encodeURIComponent('jxl,avif,webp,png');

  if (image_order) {
    try {
      const imageOrder = decodeURIComponent(image_order)
        .split(',')
        .filter(ext => ['jxl', 'avif', 'webp', 'png'].includes(ext))
        .join(',');

      // response.headers.append('set-cookie', `image_order=${encodeURIComponent(imageOrder)}; Path=/; Expires=${expire};`);
      event.cookies.set('image_order', imageOrder, {
        path: '/',
        expires: expire,
        httpOnly: false,
      });
    } catch {
      // console.log(`image_order=${defaultOrder}; Path=/; Expires=${expire};`);
      // response.headers.append('set-cookie', `image_order=${defaultOrder}; Path=/; Expires=${expire};`);
      event.cookies.set('image_order', defaultOrder, {
        path: '/',
        expires: expire,
        httpOnly: false,
      });
    }
  } else {
    // response.headers.append('set-cookie', `image_order=${defaultOrder}; Path=/; Expires=${expire};`);
    event.cookies.set('image_order', defaultOrder, {
      path: '/',
      expires: expire,
      httpOnly: false,
    });
  }

  return resolve(event);
}

function resolveJwt(jwt?: Jwt, scope: 'user' | 'refresh' = 'user'): IUserSession | undefined {
  if (!jwt) {
    return undefined;
  }

  const body = jwt.body.toJSON();

  if (body.iss !== 'https://ru.hn/' || body.scope !== scope) {
    return undefined;
  }

  return body as any;
}

/** @type {import('@sveltejs/kit').Handle} */
async function auth({event, resolve}: HandleParameters): Promise<Response> {
  const token = event.cookies.get('token');

  if (token) {
    const jwt = njwt.verify(token, key);
    const body = resolveJwt(jwt, 'user');

    if (!body) {
      event.locals.user = body;
      return resolve(event);
    }

    event.locals.user = body;
  } else {
    const refresh = event.cookies.get('refresh');

    if (refresh) {
      const jwt = njwt.verify(refresh, key);
      const body = resolveJwt(jwt, 'refresh');

      if (!body) {
        event.locals.user = body;
        return resolve(event);
      }

      const {sub} = body;
      const user = User.fromSub(sub);
      const newToken = await user?.token('user', {
        rank: await user.rank,
        adult: await user.isAdult(),
      });
      if (newToken) {
        event.cookies.set('token', newToken.compact(), {
          path: '/',
          expires: dayjs().add(10, 'minutes').toDate(),
          sameSite: 'strict',
          httpOnly: true,
          secure: !env.IS_DEV,
        });

        event.locals.user = newToken.body.toJSON() as any;
      } else {
        console.error('no token?');
      }
    }
  }

  return resolve(event);
}

const newUuid = () => uuid('https://ru.hn', uuid.URL);
const validate = (uuid?: string) => validateUuid(uuid) && versionUuid(uuid) === 5;

/** @type {import('@sveltejs/kit').Handle} */
async function setSessionId({event, resolve}: HandleParameters): Promise<Response> {
  const cookie = event.cookies;
  const session_id = cookie.get('session_id');
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

/** @type {import('@sveltejs/kit').Handle}
 * 사용자에게
 */
async function setPermissions({event, resolve}: HandleParameters): Promise<Response> {
  if (event.locals?.user) {
    const user = User.fromSub(event.locals.user.sub)!;
    const {permissions} = user;
    const all = await permissions.getAll();
    if (isEmpty(all)) {
      permissions.set(Permissions.DefaultPermissions).then();
    }
  }
  return resolve(event);
}

interface HandleParameters {
  event: RequestEvent,
  resolve: (event: RequestEvent, opts?: ResolveOptions) => MaybePromise<Response>
}
//