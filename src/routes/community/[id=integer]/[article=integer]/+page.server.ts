import type {LoadEvent} from '@sveltejs/kit';
import type {PageData} from './$types';
import {retrive as retriveArticle} from './api/read/+server';
import {retrive as retriveComments} from './api/comment/+server';
import {Board} from '$lib/community/board/server';

export async function load(event: LoadEvent): Promise<Partial<PageData>> {
  const article = await retriveArticle(event as any);
  const board = new Board(event.params.id!);

  const {comments} = await retriveComments(event as any);

  return {
    boardName: await board.name,
    ...article,
    comments,
  };
}
