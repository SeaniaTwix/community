import {
  // @ts-ignore
  json as Json,
  // @ts-ignore
  error as err,
  // @ts-ignore
  redirect as Redirect,
} from '@sveltejs/kit';

export const json = Json;
/**
 * @throws {Error}
 */
export const error = err;
export const redirect = Redirect;