import {
  // @ts-ignore
  json as Json,
  // @ts-ignore
  error as err,
  // @ts-ignore
  redirect as Redirect,
  type RequestHandler,
} from '@sveltejs/kit';

export const json = Json;
/**
 * @throws {Error}
 */
export const error = ((s, m) => new (err(s, m) as any)) as (status: number, message?: string | undefined) => ErrorConstructor;
export const redirect = Redirect;