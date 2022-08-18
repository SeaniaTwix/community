import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {Board} from '$lib/community/board/server';
import HttpStatus from 'http-status-codes';
import {parseInt} from 'lodash-es';

export async function GET({params, url, locals: {user, sessionId}}: RequestEvent): Promise<RequestHandlerOutput> {
  const pageParam = url.searchParams.get('page') ?? '1';
  const page = parseInt(pageParam);
  if (isNaN(page)) {
    return {
      status: HttpStatus.BAD_REQUEST,
      body: {
        reason: 'only number allowed in page',
      },
    };
  }
  try {
    const {id} = params;
    const board = new Board(id);
    const announcements = await board.getAnnouncements(page, user ? user.uid : sessionId);
    return {
      status: HttpStatus.OK,
      body: {
        announcements,
      },
    };
  } catch (e: any) {
    console.log(e)
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString(),
      },
    };
  }
}