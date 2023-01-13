import type {ServerLoadEvent} from '@sveltejs/kit';
import {redirect} from '$lib/kit';
import HttpStatus from '$lib/http-status';

export async function load({locals}: ServerLoadEvent): Promise<any> {
  if (!locals.user) {
    throw redirect(HttpStatus.MOVED_TEMPORARILY, '/login');
  }
}