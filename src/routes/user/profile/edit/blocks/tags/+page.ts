import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';

export async function load({fetch, session}: LoadEvent): Promise<LoadOutput> {
  if (!session) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
    return {
      status: HttpStatus.MOVED_TEMPORARILY,
      redirect: '/login',
    };
  }

  const requestTags = await fetch('/user/profile/edit/blocks/api/tags');
  const {blocked} = await requestTags.json();

  throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
  return {
    status: HttpStatus.OK,
    props: {
      blocked,
    },
  };

}
