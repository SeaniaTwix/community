import {error} from '@sveltejs/kit';
import type {ServerLoadEvent} from '@sveltejs/kit';
import {EUserRanks} from '$lib/types/user-ranks';

export async function load({locals: {user}, }: ServerLoadEvent): Promise<void> {
  if (!user || user.rank <= EUserRanks.User) {
    throw error(404, 'Page not found');
  }
}
