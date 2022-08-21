import { json } from '@sveltejs/kit';

import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import db from '$lib/database/instance';
import {aql} from 'arangojs';

// noinspection JSUnusedGlobalSymbols
export async function DELETE({request, params, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return json({
  reason: 'you\'re not manager',
}, {
      status: HttpStatus.NOT_ACCEPTABLE
    })
  }


  const {id} = params;

  await db.query(aql`
    for article in articles
      filter article.board == ${id}
        remove article in article`)

  return new Response(undefined, { status: HttpStatus.ACCEPTED })
}

