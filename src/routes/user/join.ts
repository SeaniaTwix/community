import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import {newLoginHeaders} from './login';
import HttpStatus from 'http-status-codes';

export async function post({request}: RequestEvent): Promise<RequestHandlerOutput> {
  let login: RegisterRequest;

  try {
    login = new RegisterRequest(await request.json());
  } catch (e: any) {
    return {
      status: HttpStatus.NOT_ACCEPTABLE,
      body: {
        reason: e.toString(),
      },
    };
  }

  try {
    await login.register();
  } catch (error) {
    return {
      status: HttpStatus.CONFLICT,
      body: {
        reason: (<any>error).toString(),
      },
    };
  }

  const {token, headers} = await newLoginHeaders(login.user);

  return {
    status: login.status,
    headers,
    body: {token},
  };
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
    if (/^[a-zA-Z가-힣\d_]+$/.test(this.id)) {
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

  get status(): number {
    return 201;
  }

  register() {
    return this.user.register(this.password);
  }
}