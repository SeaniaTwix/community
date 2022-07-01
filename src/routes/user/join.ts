import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import {newLoginHeaders} from './login';
import HttpStatus from 'http-status-codes';

export async function post({request}: RequestEvent): Promise<RequestHandlerOutput> {
  const login = new RegisterRequest(await request.json());

  try {
    await login.register();
  } catch (error) {
    return {
      status: HttpStatus.CONFLICT,
      body: {
        reason: (<any>error).toString(),
      }
    }
  }

  const {token, headers} = await newLoginHeaders(login.user);

  return {
    status: login.status,
    headers,
    body: {token}
  };
}

class RegisterRequest {
  user: User;

  constructor(private body: Rec<string>) {
    this.user = new User(this.id);
  }

  get id(): string {
    return this.body.id;
  }

  get password(): string {
    return this.body.pw;
  }

  get status(): number {
    return 201;
  }

  register() {
    return this.user.register(this.password);
  }
}