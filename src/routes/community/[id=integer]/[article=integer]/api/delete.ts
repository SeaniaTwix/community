import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import db from '$lib/database/instance';
import {aql} from 'arangojs';

export async function del({params, url}: RequestEvent): Promise<RequestHandlerOutput> {
  const {board, article} = params;
  const permanent = !!url.searchParams.get('permanant');

  const remover = new ArticleDeleteRequest(article);


  return {
    status: HttpStatus.GONE,
  }
}

class ArticleDeleteRequest {
  constructor(private readonly articleId: string) {
  }

  async delete(permanant: boolean) {
    return await db.query(aql`
      update {_key: ${this.articleId}, pub: false} in articles`);
  }
}