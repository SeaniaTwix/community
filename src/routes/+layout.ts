import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
import type {BoardItemDto} from '$lib/types/dto/board-item.dto';
import HttpStatus from 'http-status-codes';

export async function load({url, fetch, session}: LoadEvent): Promise<LoadOutput> {
  try {
    const response = await fetch(`${url.origin}/community/api/all`);
    const {boards} = await response.json<{ boards: BoardItemDto[] }>();

    if (session.user) {
      const notiRes = await fetch('/notifications/api/unread');
      const {unread} = await notiRes.json();
    }

    /*
    let user: IUser;

    try {
      if (uid) {
        const ur = await fetch(`/user/profile/api/detail?id=${uid}`);
        const result = await ur.json<{ user: IUser }>();
        user = result.user;

      }
    } catch {
      // user not found;
    } */

    return {
  boards,
};
  } catch (e) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
    return {
      status: HttpStatus.BAD_GATEWAY,
      error: e.toString(),
    };
  }

}
