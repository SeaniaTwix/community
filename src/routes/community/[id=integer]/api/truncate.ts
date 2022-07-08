
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import db from '../../../../lib/database/instance';
import {aql} from 'arangojs';

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

  await db.query(aql`
    for article in articles
      filter article.board == ${id}
        remove article in article`)

  return {
    status: HttpStatus.GONE,
  }
}

