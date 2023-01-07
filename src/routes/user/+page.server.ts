import type {ServerLoadEvent} from '@sveltejs/kit';
import {redirect} from '$lib/kit';
import HttpStatus from '$lib/http-status';
import {User} from '$lib/auth/user/server';

export async function load({locals}: ServerLoadEvent): Promise<any> {
  if (!locals || !locals.user) {
    throw redirect(HttpStatus.MOVED_TEMPORARILY, '/login');
  }
  const id = locals.user.sub.split('/')[1]!;
  const user = new User(id);
  const isAdult = await user.isAdult();
  return {isAdult};
}