import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import {RegisterRequest} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {newLoginHeaders} from '@routes/user/login/+server';
import {error} from '$lib/kit';

export async function POST({request}: RequestEvent): Promise<Response> {
  let login: RegisterRequest;

  try {
    login = new RegisterRequest(await request.json());
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }

  try {
    await login.register();
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }

  const {token, headers} = await newLoginHeaders(login.user);

  return json({token: token.compact()}, {
    status: HttpStatus.CREATED,
    headers: headers,
  });
}
