
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';

// noinspection JSUnusedGlobalSymbols
export async function del({request, params, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return {
      status: HttpStatus.NOT_ACCEPTABLE,
      body: {
        reason: 'you\'re not manager',
      }
    }
  }


  const {id} = params;



  return {
    status: HttpStatus.GONE,
  }
}

