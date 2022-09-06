import type {ServerLoadEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import type {PageData} from './$types';
import {error} from '$lib/kit';
import {GET as RequestTags} from '../api/tags/+server';

export async function load({locals}: ServerLoadEvent): Promise<PageData> {
  if (!locals.user) {
    throw error(HttpStatus.MOVED_TEMPORARILY, '/login');
  }

  const requestTags = await RequestTags({locals} as any);
  const {blocked} = await requestTags.json();

  return {
    blocked,
  };

}
