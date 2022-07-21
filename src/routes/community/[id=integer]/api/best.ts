import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {Board} from '$lib/community/board/server';
import HttpStatus from 'http-status-codes';
import {parseInt} from 'lodash-es';

export async function GET({params, url}: RequestEvent): Promise<RequestHandlerOutput> {
  const pageParam = url.searchParams.get('page') ?? '1';
  const page = parseInt(pageParam);
  if (isNaN(page)) {
    return {
      status: HttpStatus.BAD_REQUEST,
      body: {
        reason: 'only number allowed in page'
      }
    }
  }
  const {id} = params;
  const board = new Board(id);
  const bests = await board.getBests(page, 1);
  return {
    status: HttpStatus.OK,
    body: {
      bests,
    }
  }
}