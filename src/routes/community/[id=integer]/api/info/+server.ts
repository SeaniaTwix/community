import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import {Board} from '$lib/community/board/server';

export async function GET({params, url}: RequestEvent): Promise<Response> {
  const {id} = params;
  const board = new Board(id!);

  return json({
    name: await board.name,

  });
}