import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {storeAllArticles} from '$lib/database/search';
import {EUserRanks} from '$lib/types/user-ranks';

export async function POST({locals}: RequestEvent): Promise<Response> {
  const {user} = locals;
  if (!user || user.rank <= EUserRanks.User) {
    return new Response(undefined, { status: HttpStatus.NOT_ACCEPTABLE })
  }

  await storeAllArticles();

  return new Response(undefined, { status: HttpStatus.ACCEPTED })
}