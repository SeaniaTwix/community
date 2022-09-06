import { error } from '@sveltejs/kit';
import type {ServerLoadEvent} from '@sveltejs/kit';
import {EUserRanks} from '$lib/types/user-ranks';

import type {PageData} from './$types';

import {GET as ManageTagRequest} from '@routes/community/[id=integer]/[article=integer]/manage/api/tags/+server';

export async function load({params, locals}: ServerLoadEvent): Promise<PageData> {
  if (!locals.user || locals.user.rank <= EUserRanks.User) {
    throw error(500, '권한이 없습니다');
  }
  const r = await ManageTagRequest({params, locals} as any);
  const {tags, author} = await r.json();
  return {
    tags,
    author,
  };
}
