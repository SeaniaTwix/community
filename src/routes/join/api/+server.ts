import {RegisterRequest, User} from '$lib/auth/user/server';
import type {RequestEvent, RequestHandler} from '@sveltejs/kit';
import {error, json} from '$lib/kit';
import HttpStatus from 'http-status-codes';
import {newLoginHeaders} from '../../login/api/+server';

// noinspection JSUnusedGlobalSymbols
export const POST: RequestHandler = async ({request}: RequestEvent): Promise<Response> => {
  let login: RegisterRequest;
  try {
    login = new RegisterRequest(await request.json());
  } catch (e: any) {
    throw error(HttpStatus.BAD_REQUEST, e.toString());
  }

  try {
    await login.register();
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }

  const {token, headers} = await newLoginHeaders(login.user);

  return json({token: token.compact()}, {
    status: HttpStatus.CREATED,
    headers,
  });
}
