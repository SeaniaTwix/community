import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import {Board} from '$lib/community/board/server';
import HttpStatus from 'http-status-codes';
import {parseInt} from 'lodash-es';
import {error} from '$lib/kit';

export async function GET({params, url, locals: {user, sessionId}}: RequestEvent): Promise<Response> {
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
    const announcements = await board.getAnnouncements(page, user ? user.uid : sessionId!);
    return json({
      announcements,
    }, {
      status: HttpStatus.OK,
    });
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }
}