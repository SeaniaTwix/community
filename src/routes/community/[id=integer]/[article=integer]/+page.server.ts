import type {LoadEvent} from '@sveltejs/kit';
import type {PageData} from './$types';
import {GET} from './api/read/+server';
import {GET as CommentGET} from './api/comment/+server';
import {Board} from '$lib/community/board/server';

export async function load(event: LoadEvent): Promise<PageData> {
  const response = await GET(event as any);
  const article = await response.json();
  const board = new Board(event.params.id!);

  const commentResponse = await CommentGET(event as any);
  const {comments} = await commentResponse.json();

  console.log('+page:', comments);
  return {
    boardName: await board.name,
    ...article,
    comments,
  };
}
