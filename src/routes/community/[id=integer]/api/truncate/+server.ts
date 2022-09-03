import {json} from '@sveltejs/kit';

import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {error} from '$lib/kit';

// noinspection JSUnusedGlobalSymbols
export async function DELETE({params, locals}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    throw error(HttpStatus.NOT_ACCEPTABLE, `you're not manager`);
  }

  const {id} = params;

  await db.query(aql`
    for article in articles
      filter article.board == ${id}
        remove article in article`);

  return new Response(undefined, {status: HttpStatus.ACCEPTED});
}

