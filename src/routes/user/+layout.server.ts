import type {ServerLoadEvent} from '@sveltejs/kit';
import {redirect} from '$lib/kit';
import HttpStatus from 'http-status-codes';

export async function load({locals}: ServerLoadEvent): Promise<any> {
  // console.log('user/+layout.server.ts:', !locals.user);
  if (!locals.user) {
    // @ts-ignore
    throw redirect(HttpStatus.MOVED_TEMPORARILY, '/login');
  }
}