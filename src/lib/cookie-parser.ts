export class CookieParser {
  constructor(private readonly cookie: string) {
    (cookie ?? '')
      .split(';')
      .map(v => v.trim())
      .map(v => v.split('='))
      .forEach((value) => {
        this.cookies[value[0]] = value[1] ?? undefined;
      });
  }

  private readonly cookies: Rec<string | undefined> = {};

  static new(cookie: string): CookieParser {
    return new CookieParser(cookie);
  }

  get(): Rec<string | undefined> {
    return this.cookies;
  }
}