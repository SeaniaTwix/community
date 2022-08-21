import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
import {isEmpty} from 'lodash-es';

export async function load({params, url, fetch}: LoadEvent): Promise<LoadOutput> {
  const q = url.searchParams.get('q') ?? '';

  if (isEmpty(q)) {
    return {
  result: [],
  q,
};
  }

  const response = await fetch(`/community/api/search?q=${encodeURIComponent(q)}`);
  const {result} = await response.json();

  return {
  result: result?.hits ?? [],
  q,
};
}
