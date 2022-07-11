import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {EUserRanks} from '$lib/types/user-ranks';

export async function del({params, url, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const {article} = params;
  const permanent = !!url.searchParams.get('permanant');

  const remover = new ArticleDeleteRequest(article);

  try {
    await remover.delete(locals.user.rank > EUserRanks.Manager && permanent);
  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString()
      }
    }
  }

  return {
    status: HttpStatus.ACCEPTED,
  }
}

class ArticleDeleteRequest {
  constructor(private readonly articleId: string) {
  }

  async delete(permanant: boolean) {
    if (permanant) {
      return await db.query(aql`
        remove {_key: ${this.articleId}} in articles`)
    }
    return await db.query(aql`
      update {_key: ${this.articleId}, pub: false} in articles`);
  }
}