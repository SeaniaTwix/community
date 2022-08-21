export class CookieParser {
  constructor(private readonly cookie: string) {
    (cookie ?? '')
      .split(';')
      .map(v => v.trim())
      .map(v => v.split('='))
      .forEach((value) => {
        this.cookies[value[0]] = decodeURIComponent(value[1]) ?? undefined;
      });
  }

  static parse(cookie: string): Record<string, string | undefined> {
    try {
      return (new CookieParser(cookie!)).get();
    } catch (e) {
      console.trace(e);
      return {};
    }
  }

  private readonly cookies: Rec<string | undefined> = {};

  static new(cookie: string): CookieParser {
    return new CookieParser(cookie);
  }

  get(): Rec<string | undefined> {
    return this.cookies;
  }
}