import { error } from '@sveltejs/kit';
import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {EUserRanks} from '$lib/types/user-ranks';

throw new Error("@migration task: Check if you need to migrate the load function input (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
export async function load({params: {id, article}, fetch, session: {user}}: LoadEvent): Promise<LoadOutput> {
  if (!user || user.rank <= EUserRanks.User) {
    throw error(500, '권한이 없습니다');
  }
  const r = await fetch(`/community/${id}/${article}/manage/api/tags`);
  const {tags, author} = await r.json();
  throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
  return {
    status: HttpStatus.OK,
    props: {
      tags,
      author,
    },
  };
}
