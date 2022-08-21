
import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';

throw new Error("@migration task: Check if you need to migrate the load function input (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
export async function load({session: {user}, url}: LoadEvent): Promise<LoadOutput> {
  if (!user) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
    return {
      status: HttpStatus.MOVED_TEMPORARILY,
      redirect: `/login`
    };
  }

  const succeed = url.searchParams.get('result') === 'succeed';
  const res = await fetch(url.origin + '/user/profile/api/my');
  const {user: userData} = await res.json();
  return {
  adult: userData?.adult === true,
  succeed,
};
}
