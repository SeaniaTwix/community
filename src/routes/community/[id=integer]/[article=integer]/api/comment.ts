import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {toInteger} from 'lodash-es';
import {Article} from '$lib/community/article/server';
import HttpStatus from 'http-status-codes';
import {CommentDto} from '$lib/types/dto/comment.dto';
import type {PublicVoteType} from '$lib/types/dto/comment.dto';
import {Pusher} from '$lib/pusher/server';
import {isStringInteger} from '$lib/util';
import type {IArangoDocumentIdentifier} from '$lib/database';

export async function get({params, url, locals}: RequestEvent): Promise<RequestHandlerOutput> {
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
  const paramPage = url.searchParams.get('page') ?? '1';
  const page = isStringInteger(paramPage) ? toInteger(paramPage) : 1;
  const paramAmount = url.searchParams.get('amount') ?? '50';
  const amount = Math.max(
    isStringInteger(paramAmount) ? toInteger(paramAmount) : 50, 50);
  const comments: (CommentDto & IArangoDocumentIdentifier)[] = await comment.list(amount, page) ?? [];

  return {
    status: HttpStatus.OK,
    body: {
      comments: await Promise.all(comments.map(async (comment) => {
        if (!Object.hasOwn(comment, 'votes')) {
          comment.myVote = {like: false, dislike: false};
          return comment;
        }
        const pubVoteResult = {like: 0, dislike: 0};
        for (const vote of Object.values(comment.votes)) {
          if (vote) {
            pubVoteResult[vote.type] += 1;
          }
        }
        (<CommentDto<PublicVoteType>>comment).votes = pubVoteResult;
        try {
          if (locals.user.uid) {
            const cursor = await db.query(aql`
            for comment in comments
              filter comment._key == ${comment._key}
                return comment.votes[${locals.user.uid}].type`);
            const type = await cursor.next() as 'like' | 'dislike';
            if (type) {
              comment.myVote = {like: false, dislike: false};
              comment.myVote[type] = true;
            }
          }
        } catch (e) {
          console.log('comment.ts:', e);
        }

        return comment;
      }) as any[]),
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
      votes: {},
      article: commentData.article,
      content: commentData.content,
      relative: commentData.relative
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

  async list(amount: number, page = 1) {
    // console.log('list:', this.article.id)
    const cursor = await db.query(aql`
      for comment in comments
        sort comment.createdAt asc
        filter comment.article == ${this.article.id} limit ${(page - 1) * amount}, ${amount}
        return comment`);
    return await cursor.all();
  }

  async add(userId: string, comment: CommentDto) {
    const cursor = await db.query(aql`
      insert merge(${comment}, {
        author: ${userId},
        createdAt: ${new Date()},
        "like": 0,
        dislike: 0
      }) into comments return NEW`)
    return await cursor.next();
  }

}