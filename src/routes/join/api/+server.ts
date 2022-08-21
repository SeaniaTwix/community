import {User} from '$lib/auth/user/server';
import type {RequestEvent, RequestHandler, RequestHandlerOutput} from '@sveltejs/kit';
import {error, json} from '$lib/kit';
import HttpStatus from 'http-status-codes';
import {newLoginHeaders} from '../../login/api/+server';

// noinspection JSUnusedGlobalSymbols
export const POST: RequestHandler = async ({request}: RequestEvent): Promise<RequestHandlerOutput> => {
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

class RegisterRequest {
  user: User;

  constructor(private body: Rec<string>) {
    if (/\s/.test(this.id)) {
      throw new Error('whitespace not allow in id');
    }
    if (this.id.length < 3) {
      throw new Error('id is too short');
    }
    if (this.id.length > 16) {
      throw new Error('id is too long');
    }
    if (this.password.length < 6) {
      throw new Error('pw is too short');
    }
    if (this.password.length > 128) {
      throw new Error('pw is too long');
    }
    if (!/^[a-zA-Z가-힣\d_]+$/.test(this.id)) {
      throw new Error('some character is not allowed');
    }
    this.user = new User(this.id);
  }

  get id(): string {
    return this.body.id;
  }

  get password(): string {
    return this.body.password;
  }

  register() {
    return this.user.register(this.password);
  }
}