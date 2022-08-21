import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {storeAllArticles} from '$lib/database/search';
import {EUserRanks} from '$lib/types/user-ranks';

export async function POST({locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const {user} = locals;
  if (!user || user.rank <= EUserRanks.User) {
    return {
      status: HttpStatus.NOT_ACCEPTABLE,
    }
  }

  await storeAllArticles();

  return {
    status: HttpStatus.ACCEPTED,
  }
}