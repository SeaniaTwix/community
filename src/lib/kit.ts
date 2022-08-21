import {
  // @ts-ignore
  json as Json,
  // @ts-ignore
  error as err,
  // @ts-ignore
  redirect as Redirect,
  type RequestHandlerOutput,
} from '@sveltejs/kit';
import type HttpStatus from 'http-status-codes';

export const json = Json as (data: any, init?: ResponseInit) => RequestHandlerOutput;
/**
 * @throws {Error}
 */
export const error = ((s, m) => new err(s, m)) as (status: number, message?: string | undefined) => ErrorConstructor;
export const redirect = Redirect as (status: typeof HttpStatus.TEMPORARY_REDIRECT | typeof HttpStatus.PERMANENT_REDIRECT, location: string) => RequestHandlerOutput;