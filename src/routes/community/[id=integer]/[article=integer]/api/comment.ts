import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {toInteger} from 'lodash-es';
import {Article} from '$lib/community/article/server';
import HttpStatus from 'http-status-codes';
import {CommentDto} from '$lib/types/dto/comment.dto';
import {Pusher} from '$lib/pusher/server';

export async function get({params, url}: RequestEvent): Promise<RequestHandlerOutput> {
  const {article} = params;
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
  const comments = await comment.list(amount) ?? [];

  return {
    status: HttpStatus.OK,
    body: {
      comments,
    },
  };
}

export async function post({params, request, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const {article} = params;

  const comment = new CommentRequest(article);

  if (!await comment.article.exists) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: 'article is not exists',
      },
    };
  }

  const data = await request.json() ;


  let commentData: CommentDto;
  try {
    commentData = new CommentDto(data);
  } catch (e) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e as any
      }
    }
  }
  // console.log(commentData);

  let cd: CommentDto;

  try {
    if (!locals.user) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error('user invalid')
    }

    cd = {
      article: commentData.article,
      content: commentData.content,
      relative: commentData.relative,
    };

    await comment.add(locals.user.uid, cd);
  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString()
      }
    }
  }

  try {
    if (cd) {
      await Pusher.notify('comments', article, locals.user.uid, cd);
    }
  } catch (e) {
    console.error(e);
  }

  return {
    status: HttpStatus.CREATED,
    body: {
      author: locals.user.uid,
      added: cd as any,
    }
  };
}

class CommentRequest {
  article: Article;

  constructor(articleId: string) {
    this.article = new Article(articleId);
  }

  async list(amount: number) {
    // console.log('list:', this.article.id)
    const cursor = await db.query(aql`
      for comment in comments
        filter comment.article == ${this.article.id} limit ${amount}
        return comment`);
    return await cursor.all();
  }

  async add(userId: string, comment: CommentDto) {
    const cursor = await db.query(aql`
      insert merge(${comment}, {author: ${userId}, createdAt: ${new Date()}}) into comments return NEW`)
    return await cursor.next();
  }

}