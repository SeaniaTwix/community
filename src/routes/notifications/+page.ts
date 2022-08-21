
import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';

export async function load({session, fetch}: LoadEvent): Promise<LoadOutput> {
  if (!session.user) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
    return {
      status: HttpStatus.MOVED_TEMPORARILY,
      redirect: '/login',
    };
  }

  const res = await fetch('/notifications/api/list');
  const {list} = await res.json();
  throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
  return {
    status: HttpStatus.OK,
    props: {
      list,
    },
  };
}
