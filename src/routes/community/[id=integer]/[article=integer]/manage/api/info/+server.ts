import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {EUserRanks} from '$lib/types/user-ranks';
import {Article} from '$lib/community/article/server';
import {error} from '$lib/kit';

const noPermissionError = {
  status: HttpStatus.NOT_ACCEPTABLE,
};

export async function GET({params, locals: {user}}: RequestEvent): Promise<Response> {
  if (!user || user.rank <= EUserRanks.User) {
    throw error(noPermissionError.status);
  }

  return new Response(undefined, { status: HttpStatus.OK })
}

class InfoManageRequest {
  private readonly article: Article;
  constructor(article: string) {
    this.article = new Article(article);
  }


}