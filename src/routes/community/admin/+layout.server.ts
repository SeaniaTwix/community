import { error } from '@sveltejs/kit';
import type {ServerLoadEvent} from '@sveltejs/kit';
import {EUserRanks} from '$lib/types/user-ranks';

export async function load({locals, }: ServerLoadEvent): Promise<void> {
  // console.log(session)
  if (!locals?.user || (locals.user.rank < EUserRanks.Manager)) {
    throw error(404, 'Page not found');
  }
}
