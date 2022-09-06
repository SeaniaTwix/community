import { json } from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import got from 'got';
import {User} from '$lib/auth/user/server';

export async function GET({url, locals}: RequestEvent): Promise<Rec<any>> {
  const code = url.searchParams.get('code');
  if (!code) {
    return json({reason: 'code is required'}, {
      status: HttpStatus.BAD_REQUEST
    });
  }

  if (!locals.user) {
    return new Response(undefined, {
      status: HttpStatus.MOVED_TEMPORARILY,
      headers: {
        Locations: `/login&back=${encodeURIComponent(`/verify?code=${code}`)}`,
      }
    });
  }

  const {BBATON_CLIENT_ID, BBATON_SECRET_KEY} = process.env;

  const auth = `Basic ${Buffer.from(`${BBATON_CLIENT_ID}:${BBATON_SECRET_KEY}`).toString('base64')}`;

  const data: Record<string, string> = {
    grant_type: 'authorization_code',
    redirect_uri: 'https://ru.hn/verify',
    code: url.searchParams.get('code') ?? 'code',
  };

  const q = Object.keys(data).map((key) => `${key}=${data[key]}`).join('&');
  const res = await got.post('https://bauth.bbaton.com/oauth/token?' + q, {
    headers: {
      'Content-Type': 'application/x-www-form-urlendcoded',
      Authorization: auth,
    },
  });

  if (res.statusCode === HttpStatus.OK) {
    const {token_type, access_token} = JSON.parse(res.body) as IResponseBBaton;

    const resUser = await got.get('https://bapi.bbaton.com/v2/user/me', {
      headers: {
        Authorization: `${token_type} ${access_token}`,
      }
    });

    if (resUser.statusCode === HttpStatus.OK) {
      const {user_id, adult_flag} = JSON.parse(resUser.body) as IResponseBBatonUserData;
      const user = await User.findByUniqueId(locals.user.uid);

      if (user && !await user.isSameAssignExists('bbaton', user_id)) {
        await user.assignAdult('bbaton', adult_flag === 'Y', user_id);

        return new Response(undefined, {
          status: HttpStatus.MOVED_TEMPORARILY,
          headers: {
            Location: '/verified?result=succeed',
          }
        });
      } else {
        return new Response(undefined, {
          status: HttpStatus.MOVED_TEMPORARILY,
          headers: {
            Location: '/verified?result=failed&reason=already_assigned',
          }
        });
      }
    }
  }

  return new Response(undefined, {
    status: HttpStatus.MOVED_TEMPORARILY,
    headers: {
      Location: '/verified?result=failed&reason=unknown',
    }
  });
}

interface IResponseBBaton {
  access_token: string;
  token_type: string;
  expires_in: number;
  scrope: string;
}

interface IResponseBBatonUserData {
  user_id: string;
  adult_flag: 'Y' | 'N'; // not sure
  birth_year: string;
  gender: string;
  income: string;
  student: string;
}