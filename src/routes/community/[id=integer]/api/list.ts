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
  const list = await board.getListRecents(amount) as any[];

  // todo: find diff way for mapping tags count (in aql if available)

  return {
    status: 200,
    body: {
      list: list.map(article => {
        const tags: Record<string, number> = {};
        for (const tagName of article.tags) {
          tags[tagName] = Object.hasOwn(tags, tagName) ? tags[tagName] + 1 : 1;
        }
        article.tags = tags;
        return article;
      }),
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

    // console.log(amount)

    const cursor = await db.query(aql`
      for article in articles
        sort article.createdAt desc
        let isPub = article.pub == null || article.pub == true
        filter article.board == ${this.id} && isPub
          let c = length(for c in comments filter c.article == article._key return c)
          let tags = (
            for userId in attributes(is_object(article.tags) ? article.tags : {})
              for tag in article.tags[userId]
                return tag.name)
          
          
          return merge(article, {comments: c, tags: tags})`);

    return await cursor.all();
  }
}