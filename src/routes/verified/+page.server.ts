import type {ServerLoadEvent} from '@sveltejs/kit';
import HttpStatus from '$lib/http-status';
import type {PageData} from './$types';
import {error, redirect} from '$lib/kit';
import {User} from '$lib/auth/user/server';

export async function load({locals: {user}, url}: ServerLoadEvent): Promise<PageData> {
  if (!user) {
    throw redirect(HttpStatus.MOVED_TEMPORARILY, '/login');
  }

  const succeed = url.searchParams.get('result') === 'succeed';

  const userInstance = await User.findByUniqueId(user.uid);

  if (!userInstance) {
    throw error(HttpStatus.BAD_GATEWAY, 'user instance is invalid: ' + user.uid);
  }

  return {
    adult: await userInstance.isAdult(),
    succeed,
  };
}
