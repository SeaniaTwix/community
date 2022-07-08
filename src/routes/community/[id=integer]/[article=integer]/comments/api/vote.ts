import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';

export async function get({url, locals, clientAddress, platform}: RequestEvent): Promise<RequestHandlerOutput> {


  return {
    status: HttpStatus.CREATED,
  }
}