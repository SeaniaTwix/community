import {error} from '$lib/kit';
import HttpStatus from 'http-status-codes';
import type {LoadEvent} from '@routes/community/[id=integer]/$types';
import {Board} from '$lib/community/board/server';
import {ListBoardRequest} from '@routes/community/[id=integer]/api/list/+server';
import {isStringInteger} from '$lib/util';
import {parseInt} from 'lodash-es';
import type {PageData} from './$types';

import {GET} from './api/list/+server';

export async function load({params, url, locals}: LoadEvent): Promise<PageData> {

  const response = await GET({params, url, locals} as any);
  return await response.json();
}
