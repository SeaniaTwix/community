import { error } from '@sveltejs/kit';
import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
import {EUserRanks} from '$lib/types/user-ranks';

export async function load({session, }: LoadEvent): Promise<LoadOutput> {
  if (!session.user || session.user.rank <= EUserRanks.User) {
    throw error(404, 'Page not found');
  }
  return 
}
