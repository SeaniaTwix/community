import type {ServerLoadEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {key} from '$lib/editor-key';
import type {PageData} from './$types';
import {error, redirect} from '$lib/kit';
import {GET} from '../api/write/+server';
import {Board} from '$lib/community/board/server';

export async function load({params, locals}: ServerLoadEvent): Promise<PageData> {
  if (!params?.id) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const board = new Board(params.id);

  const response = await GET({params, locals} as any);
  const data = await response.json();

  return {
    editorKey: key,
    boardName: await board.name,
    usedTags: data.tags,
  };
}
