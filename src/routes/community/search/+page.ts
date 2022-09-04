import type {LoadEvent} from '@sveltejs/kit';
import {isEmpty} from 'lodash-es';
import type {PageData} from './$types';

export async function load({url, fetch}: LoadEvent): Promise<PageData> {
  const q = url.searchParams.get('q') ?? '';

  if (isEmpty(q)) {
    return {
      result: [],
      q,
    };
  }

  const response = await fetch(`/community/api/search?q=${encodeURIComponent(q)}`);
  const {result} = await response.json();

  console.log('search:', result);

  return {
    result: result?.hits ?? [],
    q,
  };
}
