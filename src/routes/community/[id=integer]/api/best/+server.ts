import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import {Board} from '$lib/community/board/server';
import HttpStatus from 'http-status-codes';
import {parseInt} from 'lodash-es';
import {error} from '$lib/kit';

export async function GET({params, url, locals: {user}}: RequestEvent): Promise<Response> {
  const pageParam = url.searchParams.get('page') ?? '1';
  const page = parseInt(pageParam);
  if (isNaN(page)) {
    return json({
      reason: 'only number allowed in page',
    }, {
      status: HttpStatus.BAD_REQUEST,
    });
  }

  const {id} = params;
  if (!id) {
    throw error(HttpStatus.BAD_GATEWAY);
  }
  const board = new Board(id);

  try {
    const bests = await board.getBests(user?.uid ?? null, 10, 1);
    return json({
      bests,
    }, {
      status: HttpStatus.OK,
    });
  } catch (e: any) {
    return json({
      reason: e.toString(),
    }, {
      status: HttpStatus.BAD_GATEWAY,
    });
  }
}