import type {PageData} from './$types';

import {retrive} from './api/list/+server';
import type {ServerLoadEvent} from '@sveltejs/kit';

export async function load(event: ServerLoadEvent): Promise<PageData> {
  return await retrive(event) as any;
}
