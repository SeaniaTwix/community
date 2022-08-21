import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {EUserRanks} from '$lib/types/user-ranks';
import {Article} from '$lib/community/article/server';

const noPermissionError: RequestHandlerOutput = {
  status: HttpStatus.NOT_ACCEPTABLE,
};

export async function GET({params, locals: {user}}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!user || user.rank <= EUserRanks.User) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return noPermissionError;
  }

  return new Response(undefined, { status: HttpStatus.OK })
}

class InfoManageRequest {
  private readonly article: Article;
  constructor(article: string) {
    this.article = new Article(article);
  }


}