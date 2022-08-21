import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import type {IUser} from '$lib/types/user';

export async function load({fetch, session, url}: LoadEvent): Promise<LoadOutput> {
  if (!session) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
    return {
      status: HttpStatus.MOVED_TEMPORARILY,
      redirect: '/login'
    }
  }

  const requestTags = await fetch('/user/profile/edit/blocks/api/users');
  const {blocked} = await requestTags.json();

  const requestUserInfos = await fetch(`/user/profile/api/detail?ids=${blocked.map(b => b.key).join(',')}`);
  const {users: usersArray} = await requestUserInfos.json() as {users: IUser[]};

  const users = {};
  for (const user of usersArray) {
    users[user._key] = user;
  }

  // console.log(url.searchParams.get('id'))

  throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
  return {
    status: HttpStatus.OK,
    props: {
      blocked,
      users,
      userId: url.searchParams.get('id') ?? '',
    }
  }

}
