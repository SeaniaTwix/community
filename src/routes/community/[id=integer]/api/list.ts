import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import type {ArticleDto} from '$lib/types/dto/article.dto';
import {isStringInteger} from '$lib/util';
import HttpStatus from 'http-status-codes';
import _ from 'lodash-es';

export async function get({params, url}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!isStringInteger(params.id)) {
    return {
      status: HttpStatus.BAD_REQUEST,
    }
  }

  const board = new ListBoardRequest(params.id);
  const amount = _.toInteger(url.searchParams.get('amount')) ?? 30;
  const list = await board.getListRecents(amount) as any;

  return {
    status: 200,
    body: {
      list,
    }
  }
}

class ListBoardRequest {
  constructor(private readonly id: string) {
  }

  async getListRecents(amount = 30): Promise<ArticleDto[]> {
    if (amount > 50) {
      throw new Error('too many');
    }

    console.log(amount)

    const cursor = await db.query(aql`
      for article in articles
        sort article.createdAt desc
        filter article.board == ${this.id}
          return article`);

    return await cursor.all();
  }
}