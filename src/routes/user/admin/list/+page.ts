import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';

export async function load({fetch}: LoadEvent): Promise<LoadOutput> {
  const res = await fetch('/user/admin/api/list');
  const {users} = await res.json();
  throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
  return {
    status: HttpStatus.OK,
    props: {
      users,
    },
  };
}
