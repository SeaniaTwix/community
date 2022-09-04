import type {ServerLoadEvent} from '@sveltejs/kit';
import type {PageData} from './$types';
import {GET} from '../api/list/+server';

export async function load({locals, url}: ServerLoadEvent): Promise<PageData> {
  const res = await GET({locals, url} as any);
  const {users} = await res.json();
  return {
    users,
  };
}
