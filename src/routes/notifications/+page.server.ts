import type {ServerLoadEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {redirect} from '$lib/kit';
import {GET} from './api/list/+server';

export async function load({locals}: ServerLoadEvent): Promise<any> {
  if (!locals.user) {
    throw redirect(HttpStatus.MOVED_TEMPORARILY, '/login');
  }

  const response = await GET({locals} as any);
  const {list} = await response.json();

  console.log(list);

  return {
    list,
  };
}
