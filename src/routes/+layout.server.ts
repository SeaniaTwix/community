import type {BoardItemDto} from '$lib/types/dto/board-item.dto';
import HttpStatus from 'http-status-codes';
// @ts-ignore
import {ServerLoadEvent} from '@sveltejs/kit';
import type {LayoutOutput} from './$types';
import {Board} from '$lib/community/board/server';
import {error} from '$lib/kit';

export async function load({request, locals}: ServerLoadEvent): Promise<LayoutOutput> {
  try {
    const boards = (await Board.listAll())
      .sort((a, b) => a.order - b.order)
      .map((board) => {
        delete board.order;
        return board;
      });


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
      user: locals?.user,
      boards
    }
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }

}
