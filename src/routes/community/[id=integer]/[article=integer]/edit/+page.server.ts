import type {ServerLoadEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {key} from '$lib/editor-key';
import type {PageData} from './$types';
import {GET} from '../api/edit/+server';
import type {IEditable} from '../api/edit/+server';
import {error} from '$lib/kit';
import {Board} from '$lib/community/board/server';

type T = { edit: IEditable };

export async function load({params, locals}: ServerLoadEvent): Promise<PageData> {
  const {id, article} = params;

  if (!id || !article) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const response = await GET({params, locals} as any);
  const {edit} = await response.json() as T;
  const {title, content, source, tags, tagCounts} = edit;

  const board = new Board(id);

  return {
    boardName: await board.name,
    content,
    editorKey: key,
    source,
    tagCounts,
    tags: Object.values(tags).map(v => v.name),
    title,
  };
}
