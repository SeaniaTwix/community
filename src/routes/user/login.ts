import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import addMinutes from 'date-fns/esm/addMinutes';
import {addDays} from 'date-fns/esm';

export function newLoginHeaders(user: User) {
  const token = user.token('user').compact();
  const expire = addMinutes(new Date(), 15).toUTCString();

  const refresh = user.token('refesh').compact();
  const expireRefresh = addDays(new Date(), 1).toUTCString();

  const headers = new Headers()
  headers.append('Set-Cookie',
    `token=${token}; Path=/; Expires=${expire}; SameSite=Strict; HttpOnly;`);
  headers.append('Set-Coodie',
    `refresh${refresh}; Path=/; Expires=${expireRefresh}; SameSite=Strict; HttpOnly;`);

  return headers;
}

export async function post({request}: RequestEvent): Promise<RequestHandlerOutput> {
  const login = new LoginRequest(await request.json());
  const user = new User(login.id);

  if (!await user.verify(login.password)) {
    return {
      status: HttpStatus.NOT_FOUND,
      body: {
        error: 'user not found',
      }
    }
  }

  const headers = newLoginHeaders(user);

  return {
    status: login.status,
    headers,
  };
}

class LoginRequest {
  constructor(private body: Rec<string>) {

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
}