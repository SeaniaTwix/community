import type {Actions} from '@sveltejs/kit';
import type {ActionData} from '@routes/login/$types';
import {User} from '$lib/auth/user/server';
import type {LoginDto} from '$lib/types/dto/login.dto';
import {error as HttpError} from '$lib/kit';
import HttpStatus from 'http-status-codes';
import {inRange} from 'lodash-es';
import dayjs from 'dayjs';
import {env} from 'node:process';

// noinspection JSUnusedGlobalSymbols
export const actions: Actions = {
  default: async ({request, cookies}): Promise<ActionData> => {
    const data = await request.formData();
    const id = data.get('id')?.toString();
    const password = data.get('password')?.toString();
    const login = new LoginRequest({id, password});

    if (!inRange(login.id.length, 3, 16)) {
      throw HttpError(HttpStatus.BAD_REQUEST, 'id allowed range in 3 ~ 16');
    }

    const user = login.init();

    if (!await login.verify()) {
      throw HttpError(HttpStatus.NOT_FOUND, 'user not found');
    }

    const token = await user.token('user', {
      rank: await user.rank,
      adult: await user.isAdult(),
    });

    const expires = dayjs().add(10, 'minute').toDate();
    token.setExpiration(expires);

    cookies.set('token', token.compact(), {
      path: '/',
      expires,
      sameSite: 'strict',
      httpOnly: true,
      secure: !env.IS_DEV,
    });

    const refresh = await user.token('refresh');
    const expireRefresh = dayjs().add(1, 'day').toDate();
    refresh.setExpiration(expireRefresh);

    cookies.set('refresh', refresh.compact(), {
      path: '/',
      expires: expireRefresh,
      sameSite: 'strict',
      httpOnly: true,
      secure: !env.IS_DEV,
    });

    return {token: token.compact()};
  }
}


class LoginRequest {
  private user: User | undefined;
  constructor(private readonly body: LoginDto) {

  }

  init(): User {
    this.user = new User(this.id);
    return this.user;
  }

  async verify(): Promise<boolean> {
    if (!this.user) {
      throw HttpError(HttpStatus.FORBIDDEN, 'user not initialized');
    }
    return this.user.verify(this.password);
  }

  get id(): string {
    return this.body.id!;
  }

  get password(): string {
    return this.body.password!;
  }
}