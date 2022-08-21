import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {key} from '$lib/editor-key';

export async function load({params, session, fetch}: LoadEvent): Promise<LoadOutput> {
  if (!params?.id) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
    return {
      status: HttpStatus.FORBIDDEN,
    };
  }

  if (!session.user) {
    try {
      sessionStorage.setItem('ru.hn:back', `/community/${params.id}/write`);
    } catch {
      //
    }

    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
    return {
      status: HttpStatus.MOVED_TEMPORARILY,
      redirect: '/login',
    };
  }

  const nr = await fetch(`/community/${params.id}/api/info`);
  const {name} = await nr.json();

  const tagRes = await fetch(`/community/${params.id}/api/write`);
  const {tags} = await tagRes.json();


  return {
  board: params.id,
  editorKey: key,
  name,
  usedTags: tags,
};
}
