import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {dayjs} from 'dayjs';
import type {LoginDto} from '$lib/types/dto/login.dto';
import {inRange} from 'lodash-es';

// noinspection JSUnusedGlobalSymbols
export async function POST({request}: RequestEvent): Promise<RequestHandlerOutput> {
  console.log('new login')
  const login = new LoginRequest(await request.json() as LoginDto);

  if (!inRange(login.id.length, 3, 16)) {
    return {
      status: HttpStatus.NOT_ACCEPTABLE,
    }
  }

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
    body: {token: token.compact()},
  };
}

export async function newLoginHeaders(user: User) {
  const token = user.token('user', {
    uid: await user.uid, rank: await user.rank
  });
  const expire = dayjs().add(10, 'minute').toDate();
  token.setExpiration(expire);

  const refresh = user.token('refresh');
  const expireRefresh = dayjs().add(1, 'day').toDate();
  refresh.setExpiration(expireRefresh);

  const headers = new Headers();
  headers.append('Set-Cookie',
    `token=${token.compact()}; Path=/; Expires=${expire.toUTCString()}; SameSite=Strict; HttpOnly;`);
  headers.append('Set-Cookie',
    `refresh=${refresh.compact()}; Path=/; Expires=${expireRefresh.toUTCString()}; SameSite=Strict; HttpOnly;`);

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