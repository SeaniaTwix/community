import ky from 'ky-universal';
import {writable} from 'svelte/store';
import {decode} from 'js-base64';
import {CookieParser} from '$lib/cookie-parser';
import type {AllowedExtensions, IUserSession} from '../../../app';

export const client = writable<App.Locals>(undefined);

function decodeToken(token: string): IUserSession | undefined {
  try {
    // console.log(JSON.parse(decode(token.split('.')[1])))
    return JSON.parse(decode(token.split('.')[1]));
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

export class User {
  constructor(private readonly id: string) {
  }

  /**
   * 로그인 토큰을 요청합니다.
   * @param password raw 비밀번호 값입니다.
   * @param recaptcha Google Recaptcha V3에서 생성된 토큰 값입니다.
   * @return JWT token
   */
  async login(password: string, recaptcha?: string): Promise<IUserSession> {
    try {
      const r = await ky.post('/login/api', {
        json: {
          id: this.id,
          password,
          recaptcha,
        }
      });

      const {token} = await r.json<ILoginResponse>()

      const user = decodeToken(token);

      client.update((old) => {
        if (typeof old !== 'object') {
          const {image_order} = CookieParser.parse(document.cookie);
          old = {
            settings: {
              imageOrder: image_order?.split(',')
                .map(v => v.trim()) as AllowedExtensions[],
            },
            user: undefined,
            ui: {
              listType: 'list',
              buttonAlign: 'right',
              commentFolding: true,
            }
          };
        }

        old.user = user;

        return old;

      });

      return user as any;
    } catch {
      // return undefined;
      throw new Error('login failed');
    }
  }

  /**
   * 회원가입 후 로그인 토큰을 요청합니다.
   * @param password raw 비밀번호 값입니다.
   * @param recaptcha Google Recaptcha V3에서 생성된 토큰 값입니다.
   * @return JWT token
   */
  async register(password: string, recaptcha: string): Promise<string> {
    const r = await ky.post('/user/join', {
      json: {
        id: this.id,
        password,
        recaptcha,
      }
    });

    const res = await r.json<ILoginResponse>();
    return res.token;
  }

  static logout() {

  }

}

export interface ILoginResponse {
  token: string;
}