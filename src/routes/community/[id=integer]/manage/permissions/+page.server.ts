import type {ServerLoadEvent} from '@sveltejs/kit';
import type {PageData} from './$types';
import {User} from '$lib/auth/user/server';
import {error} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {Permissions} from '$lib/community/permission/server';
import {Board} from '$lib/community/board/server';

export async function load({params: {id: bid}, locals}: ServerLoadEvent): Promise<PageData> {
  if (!locals.user) {
    throw error(HttpStatus.UNAUTHORIZED);
  }

  const user = User.fromSub(locals.user.sub);

  if (!user || !bid) {
    throw error(HttpStatus.BAD_GATEWAY, 'Invalid request');
  }

  const board = new Board(bid);

  const request = new PermissionRequest(board, user);

  if (!await request.isAccessible()) {
    throw error(HttpStatus.FORBIDDEN, 'You have no permissions');
  }


  return {
    managers: [],
    requires: 12401240125125125401024012400n,
  }
}

class PermissionRequest {

  constructor(private readonly board: Board,
              private readonly user: User) {
  }

  isAccessible() {
    // const permissions = this.user.permissions;
    const permissions = new Permissions(this.board, this.user);
    return permissions.hasOwn(Permissions.FLAGS.MANAGE_ARTICLE);
  }

}