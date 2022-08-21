import { json as json$1 } from '@sveltejs/kit';
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {dayjs} from 'dayjs';
import type {LoginDto} from '$lib/types/dto/login.dto';
import {inRange} from 'lodash-es';

// noinspection JSUnusedGlobalSymbols
export async function POST({request}: RequestEvent): Promise<RequestHandlerOutput> {
  // console.log('new login')
  const login = new LoginRequest(await request.json() as LoginDto);

  if (!inRange(login.id.length, 3, 16)) {
    return new Response(undefined, { status: HttpStatus.NOT_ACCEPTABLE })
  }

  const user = new User(login.id);

  if (!await user.verify(login.password)) {
    return json$1({
  error: 'user not found',
}, {
      status: HttpStatus.NOT_FOUND
    });
  }

  const {token, headers} = await newLoginHeaders(user);

  return json$1({token: token.compact()}, {
    status: login.status,
    headers: headers
  });
}

export async function newLoginHeaders(user: User) {
  const token = await user.token('user', {
    rank: await user.rank, adult: await user.isAdult(),
  });
  const expire = dayjs().add(10, 'minute').toDate();
  token.setExpiration(expire);

  const refresh = await user.token('refresh');
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