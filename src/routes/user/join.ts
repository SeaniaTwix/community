import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import {newLoginHeaders} from './login';

export async function post({request}: RequestEvent): Promise<RequestHandlerOutput> {
  const login = new RegisterRequest(await request.json());

  await login.register();

  const headers = newLoginHeaders(login.user);

  return {
    status: login.status,
    headers,
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