import { json } from '@sveltejs/kit';
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {Board} from '$lib/community/board/server';
import HttpStatus from 'http-status-codes';
import {parseInt} from 'lodash-es';

export async function GET({params, url, locals: {user}}: RequestEvent): Promise<RequestHandlerOutput> {
  const pageParam = url.searchParams.get('page') ?? '1';
  const page = parseInt(pageParam);
  if (isNaN(page)) {
    return json({
  reason: 'only number allowed in page',
}, {
      status: HttpStatus.BAD_REQUEST
    });
  }
  try {
    const {id} = params;
    const board = new Board(id);
    const bests = await board.getBests(page, user?.uid ?? null, 10, 1);
    return json({
  bests,
}, {
      status: HttpStatus.OK
    });
  } catch (e: any) {
    return json({
  reason: e.toString(),
}, {
      status: HttpStatus.BAD_GATEWAY
    });
  }
}