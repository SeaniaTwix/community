import type {ServerLoadEvent} from '@sveltejs/kit';
import {redirect} from '$lib/kit';
import HttpStatus from 'http-status-codes';

export async function load({locals}: ServerLoadEvent): Promise<any> {
  console.log('user/+page.server.ts:', !locals.user);
  if (!locals.user) {
    throw redirect(HttpStatus.MOVED_TEMPORARILY, '/login');
  }
}