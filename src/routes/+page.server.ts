import type {ServerLoadEvent} from '@sveltejs/kit';
// import {getRecentCommit} from '$lib/git';
import type {PageData} from '@routes/$types';

export async function load({request}: ServerLoadEvent): Promise<PageData> {
  return {
    // version: getRecentCommit()
  };
}