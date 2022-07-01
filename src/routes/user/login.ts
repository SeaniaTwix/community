import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {dayjs} from 'dayjs';
import type {LoginDto} from '$lib/types/dto/login.dto';

// noinspection JSUnusedGlobalSymbols
export async function post({request}: RequestEvent): Promise<RequestHandlerOutput> {
  const login = new LoginRequest(await request.json() as LoginDto);
  const user = new User(login.id);

  if (!await user.verify(login.password)) {
    return {
      status: HttpStatus.NOT_FOUND,
      body: {
        error: 'user not found',
      },
    };
  }

  const {token, headers} = await newLoginHeaders(user);

  return {
    status: login.status,
    headers,
    body: {token},
  };
}

export async function newLoginHeaders(user: User) {
  const token = user.token('user', {uid: await user.uid, rank: await user.rank}).compact();
  // const expire = addMinutes(new Date(), 15).toUTCString();
  const expire = dayjs().add(15, 'minute').toDate().toUTCString();

  const refresh = user.token('refesh').compact();
  // const expireRefresh = addDays(new Date(), 1).toUTCString();
  const expireRefresh = dayjs().add(1, 'day').toDate().toUTCString();

  const headers = new Headers();
  headers.append('Set-Cookie',
    `token=${token}; Path=/; Expires=${expire}; SameSite=Strict; HttpOnly;`);
  headers.append('Set-Cookie',
    `refresh=${refresh}; Path=/; Expires=${expireRefresh}; SameSite=Strict; HttpOnly;`);

  return {token, headers};
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