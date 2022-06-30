import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import addMinutes from 'date-fns/addMinutes';
import addDays from 'date-fns/addDays';
import type {LoginDto} from '$lib/types/dto/login.dto';

// noinspection JSUnusedGlobalSymbols
export async function post({request}: RequestEvent): Promise<RequestHandlerOutput> {
  const login = new LoginRequest(await request.json() as LoginDto);
  const user = new User(login.id);

  console.log(login);

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

export function newLoginHeaders(user: User) {
  const token = user.token('user', {id: user.id,}).compact();
  const expire = addMinutes(new Date(), 15).toUTCString();

  const refresh = user.token('refesh').compact();
  const expireRefresh = addDays(new Date(), 1).toUTCString();

  const headers = new Headers()
  headers.append('Set-Cookie',
    `token=${token}; Path=/; Expires=${expire}; SameSite=Strict; HttpOnly;`);
  headers.append('Set-Cookie',
    `refresh=${refresh}; Path=/; Expires=${expireRefresh}; SameSite=Strict; HttpOnly;`);

  return headers;
}

class LoginRequest {
  constructor(private readonly body: LoginDto) {

  }

  get id(): string {
    return this.body.id!;
  }

  get password(): string {
    return this.body.password!;
  }

  get status(): number {
    return 201;
  }
}