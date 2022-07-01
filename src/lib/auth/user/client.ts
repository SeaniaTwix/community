import ky from 'ky-universal';

export class User {
  constructor(private readonly id: string) {
  }

  /**
   * 로그인 토큰을 요청합니다.
   * @param password raw 비밀번호 값입니다.
   * @param recaptcha Google Recaptcha V3에서 생성된 토큰 값입니다.
   * @return JWT token
   */
  async login(password: string, recaptcha: string): Promise<string> {
    const r = await ky.post('/user/login', {
      json: {
        id: this.id,
        password,
        recaptcha,
      }
    });

    const res = await r.json<ILoginResponse>()
    return res.token;
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

}

export interface ILoginResponse {
  token: string;
}