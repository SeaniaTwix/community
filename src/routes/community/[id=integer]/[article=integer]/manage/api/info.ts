import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {EUserRanks} from '$lib/types/user-ranks';
import {Article} from '$lib/community/article/server';

const noPermissionError: RequestHandlerOutput = {
  status: HttpStatus.NOT_ACCEPTABLE,
};

export async function GET({params, locals: {user}}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!user || user.rank <= EUserRanks.User) {
    return noPermissionError;
  }

  return {
    status: HttpStatus.OK,
  }
}

class InfoManageRequest {
  private readonly article: Article;
  constructor(article: string) {
    this.article = new Article(article);
  }


}