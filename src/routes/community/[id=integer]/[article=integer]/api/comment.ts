import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {toInteger} from 'lodash-es';
import {Article} from '$lib/community/article/server';
import HttpStatus from 'http-status-codes';

export async function get({params, url, request}: RequestEvent): Promise<RequestHandlerOutput> {
  const {id, article} = params;
  const comment = new CommentRequest(article);
  if (!await comment.article.exists) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: 'article is not exists',
      },
    };
  }
  const amount = Math.max(toInteger(url.searchParams.get('amount')) ?? 50, 50);
  return {
    status: 201,
    body: {
      comments: await comment.list(amount),
    },
  };
}

export async function post({params, request, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const {id, article} = params;
  const data = await request.json();

  const comment = new CommentRequest(article);
  if (!await comment.article.exists) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: 'article is not exists',
      },
    };
  }

  comment.add(locals.user.uid, '')

  return {
    status: 201,
  };
}

class CommentRequest {
  article: Article;

  constructor(articleId: string) {
    this.article = new Article(articleId);
  }

  async list(amount: number) {
    const cursor = await db.query(aql`
      for comment in comments
        limit ${amount}
        return comments`);
    return await cursor.all();
  }

  async add(author: string, content: string, relative?: string) {

  }

}