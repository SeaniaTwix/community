import type {PageData} from './$types';

import {retrive} from './api/list/+server';
import type {ServerLoadEvent} from '@sveltejs/kit';

export async function load({params, url, locals}: ServerLoadEvent): Promise<PageData> {
  return await retrive({params, url, locals} as any) as any;
}
