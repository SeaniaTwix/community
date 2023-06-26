import {error, redirect} from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import HttpStatus from '$lib/http-status';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import njwt, {Jwt} from 'njwt';
import { User } from '@root/lib/auth/user/server';

export const load = (async ({locals, url}) => {
  if (!locals.user) {
    console.log(locals.user)
    throw redirect(HttpStatus.TEMPORARY_REDIRECT, `/login?redir=${encodeURIComponent(url.toString())}`);
  }

  const app = url.searchParams.get('app');

  if (!app) {
    throw error(HttpStatus.BAD_REQUEST, '비정상적인 어플리케이션입니다.');
  }

  const token = url.searchParams.get('token');

  if (!token) {
    throw error(HttpStatus.UNAUTHORIZED, '잘못된 토큰입니다.');
  }

  const cursor = await db.query(aql`
  for app in apps
    filter app.name == ${app}
      return app`);

  if (!cursor.hasNext) {
    throw error(HttpStatus.BAD_GATEWAY, '비정상적인 어플리케이션입니다.');
  }

  const {secret, scope: allowedScope, fallback, callback} = await cursor.next() as {
    secret: string,
    scope: string[],
    fallback: string,
    callback: string,
  };

  let data: Jwt | undefined;

  try {
    data = njwt.verify(token, secret);
  } catch (e: any) {
    if (e.userMessage === 'Jwt is expired') {
      return {
        error: 'expired',
      }
    }
    console.error(e);
    return {
      error: 'unknown',
    }
  }

  if (!data) {
    throw error(HttpStatus.UNAUTHORIZED, '잘못된 토큰입니다.');
  }

  const {sub: name, scope: tokenScope,} = data.body.toJSON();
  console.log(data.body.toJSON())

  if (name !== app || !tokenScope) {
    throw error(HttpStatus.BAD_GATEWAY, '잘못 발부된 토큰입니다.');
  }

  const isLoginAllowed = tokenScope.toString()
    .split(',')
    .filter(s => allowedScope.includes(s))
    .includes('login');

  if (!isLoginAllowed) {
    throw error(HttpStatus.UNAUTHORIZED, '허용되지 않은 접근입니다.');
  }

  const user = User.fromSub(locals.user.sub)!;
  const exchangeToken = await user.token('exchange', {
    app,
  }, secret);

  return {
    external: {
      token: exchangeToken.compact(),
      callback,
      fallback,
    },
  };
}) satisfies PageServerLoad;
