import type {ServerLoadEvent} from '@sveltejs/kit';
import {redirect} from '$lib/kit';
import HttpStatus from 'http-status-codes';

export async function load({locals, }: ServerLoadEvent): Promise<void> {
  if (!locals.user) {
    throw redirect(HttpStatus.MOVED_TEMPORARILY, '/login');
  }
}
