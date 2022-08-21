import type {
  RequestEvent,
  RequestHandler,
  RequestHandlerOutput,
} from "@sveltejs/kit";
import type {LoginDto} from '$lib/types/dto/login.dto';
import {inRange} from 'lodash-es';
import HttpStatus from 'http-status-codes';
import {User} from '$lib/auth/user/server';
import {error as HttpError, json} from '$lib/kit';
import {dayjs} from 'dayjs';

// noinspection JSUnusedGlobalSymbols
export const POST: RequestHandler = async ({request}: RequestEvent): Promise<RequestHandlerOutput> => {
  const login = new LoginRequest(await request.json() as LoginDto);

  if (!inRange(login.id.length, 3, 16)) {
    throw HttpError(HttpStatus.BAD_REQUEST, 'id allowed range in 3 ~ 16');
  }

  const user = login.init();

  if (!await login.verify()) {
    throw HttpError(HttpStatus.NOT_FOUND, 'user not found');
  }

  const {token, headers} = await newLoginHeaders(user);

  return json({token: token.compact()}, {
    headers,
    status: HttpStatus.ACCEPTED
  });
};

export const DELETE: RequestHandler = async ({request}: RequestEvent): Promise<RequestHandlerOutput> => {
  return new Response(undefined, {status: HttpStatus.ACCEPTED, headers: newLogoutHeader()});
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

function newLogoutHeader() {
  const rightNow = dayjs().toDate().toUTCString();

  const headers = new Headers();
  headers.append('Set-Cookie',
    `token=; Path=/; Expires=${rightNow}; SameSite=Strict; HttpOnly;`);
  headers.append('Set-Cookie',
    `refresh=; Path=/; Expires=${rightNow}; SameSite=Strict; HttpOnly;`);

  return headers;
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