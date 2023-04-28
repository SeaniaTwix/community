import type {ServerLoadEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import type {PageData} from './$types';
import {retriveEditInfo} from '../api/edit/+server';
import type {IEditable} from '../api/edit/+server';
import {error} from '$lib/kit';
import {Board} from '$lib/community/board/server';
import {env} from 'node:process';

type T = { edit: IEditable };

export async function load({params, locals}: ServerLoadEvent): Promise<PageData> {
  const {id, article} = params;

  if (!id || !article) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const {edit} = await retriveEditInfo({params, locals} as any) as T;
  // console.log(edit)
  const {title, content, source, tags, tagCounts} = edit;

  const board = new Board(id);

  return {
    boardName: await board.name,
    content,
    editorKey: env.EDITOR_KEY ?? '',
    source,
    tagCounts,
    tags: Object.values(tags).map(v => v.name),
    title,
  };
}
