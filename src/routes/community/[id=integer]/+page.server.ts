import type {PageData} from './$types';

import {retrive} from './api/list/+server';
import {CookieParser} from '$lib/cookie-parser';
import type {ServerLoadEvent} from '@sveltejs/kit';

export async function load({request, params, url, locals}: ServerLoadEvent): Promise<PageData> {
  const {list_type} = CookieParser.parse(request.headers.get('cookie') ?? '');
  console.log(list_type);
  return await retrive({params, url, locals} as any) as any;
}
