import type {LoadEvent} from '@routes/community/[id=integer]/$types';
import {json} from '$lib/kit';

export async function load({params, url, locals}: LoadEvent): Promise<Rec<any>> {
  return {
    test:1
  }
}