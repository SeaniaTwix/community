import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {dayjs} from 'dayjs';
import type {LoginDto} from '$lib/types/dto/login.dto';
import {inRange} from 'lodash-es';
import {error} from '$lib/kit';
import {newLoginHeaders} from '@routes/login/api/+server';

// noinspection JSUnusedGlobalSymbols
export async function POST({request}: RequestEvent): Promise<Response> {
  // console.log('new login')
  const login = new LoginRequest(await request.json() as LoginDto);

  if (!inRange(login.id.length, 3, 16)) {
    return new Response(undefined, {status: HttpStatus.NOT_ACCEPTABLE});
  }

  const user = new User(login.id);

  if (!await user.verify(login.password)) {
    throw error(HttpStatus.NOT_FOUND, 'user not found');
  }

  const {token, headers} = await newLoginHeaders(user);

  return json({token: token.compact()}, {
    status: login.status,
    headers: headers,
  });
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