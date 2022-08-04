import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {isEmpty, toInteger} from 'lodash-es';
import {Article} from '$lib/community/article/server';
import HttpStatus from 'http-status-codes';
import {CommentDto} from '$lib/types/dto/comment.dto';
import type {PublicVoteType} from '$lib/types/dto/comment.dto';
import {Pusher} from '$lib/pusher/server';
import {isStringInteger} from '$lib/util';
import type {IArangoDocumentIdentifier} from '$lib/database';
import {Notifications} from '$lib/notifications/server';
import {User} from '$lib/auth/user/server';
import type {IComment} from '$lib/types/comment';
import {Comment} from '$lib/community/comment/server';
import {sanitize} from '$lib/community/comment/client';

export async function GET({params, url, locals}: RequestEvent): Promise<RequestHandlerOutput> {
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
  const reader = locals.user ? locals.user.uid : null;
  const comments: (CommentDto & IArangoDocumentIdentifier)[] = await comment.list(amount, page, reader) ?? [];

  return {
    status: HttpStatus.OK,
    body: {
      comments: await Promise.all(comments.map(async (comment: CommentDto<PublicVoteType> & IArangoDocumentIdentifier) => {
        const pubVoteResult = {like: 0, dislike: 0};
        if (!Object.hasOwn(comment, 'votes')) {
          (<CommentDto<PublicVoteType>>comment).votes = pubVoteResult;
          comment.myVote = {like: false, dislike: false};
          return comment;
        }
        for (const vote of Object.values(comment.votes)) {
          if (vote) {
            // @ts-ignore
            pubVoteResult[vote.type] += 1;
          }
        }
        (<CommentDto<PublicVoteType>>comment).votes = pubVoteResult;
        try {
          if (locals.user?.uid) {
            const cursor = await db.query(aql`
            for comment in comments
              filter comment._key == ${comment._key}
                return comment.votes[${locals.user.uid}].type`);
            const type = await cursor.next() as 'like' | 'dislike';
            comment.myVote = {like: false, dislike: false};
            if (type) {
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

export async function POST({params, request, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const {id, article} = params;

  const comment = new CommentRequest(article);

  try {
    const articleData = await comment.article.get();
    if (!articleData || articleData.board !== id) {
      return {
        status: HttpStatus.BAD_GATEWAY,
        body: {
          reason: 'article is not exists',
        },
      };
    }
  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString(),
      },
    };
  }

  const articleObj = new Article(article);
  const isRequireAuth = await articleObj.isForAdult();

  const data = await request.json();


  let commentData: CommentDto;
  try {
    commentData = new CommentDto(data);

    if (isEmpty(commentData.content) && isEmpty(commentData.image)) {
      return {
        status: HttpStatus.NOT_ACCEPTABLE,
        body: {
          reason: 'content is require'
        }
      }
    }

  } catch (e) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e as any,
      },
    };
  }
  // console.log(commentData);

  let cd: CommentDto;
  let savedComment: IComment;

  try {
    if (!locals.user) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error('user invalid');
    }

    const content = await sanitize(commentData.content ?? '');


    cd = {
      votes: {},
      article: commentData.article,
      content,
      pub: true,
      // relative: commentData.relative,
    };

    if (commentData.image) {
      cd.image = commentData.image;
      cd.imageSize = commentData.imageSize;
    }

    if (isEmpty(content) && !cd.image) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          reason: 'you have to write more than one character or upload image',
        },
      };
    }

    if (commentData.relative) {
      const replyTarget = new Comment(commentData.relative);
      if (!await replyTarget.exists()) {
        return {
          status: HttpStatus.NOT_FOUND,
          body: {
            reason: 'relative target not found',
          }
        }
      }

      cd.relative = commentData.relative;
    }

    savedComment = await comment.add(locals.user.uid, cd);

  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString(),
      },
    };
  }

  try {
    if (savedComment) {
      await Pusher.notify('comments', `${article}@${id}`, locals.user.uid, {
        ...cd, _key: savedComment._key
      }, isRequireAuth);
    }
  } catch (e) {
    console.error(e);
  }

  try {
    if (cd) {
      const {author: authorId} = await comment.article.get();
      const author = await User.findByUniqueId(authorId);
      const blocked = await author?.isBlockedUser(locals.user.uid) === true;
      if (author && await author.uid !== locals.user.uid && !blocked) {
        const noti = new Notifications(author);
        noti.send('articles', {
          type: 'comment',
          value: savedComment._key,
          root: `${id}/${article}`,
          target: article,
        }, locals.user.uid).then().catch();
      }
    }
  } catch (e) {
    // todo: error handling when notification failed
  }

  return {
    status: HttpStatus.CREATED,
    body: {
      author: locals.user.uid,
      added: cd as any,
    },
  };
}


class CommentRequest {
  article: Article;

  constructor(articleId: string) {
    this.article = new Article(articleId);
  }

  list(amount: number, page = 1, reader: string | null) {
    // console.log('list:', this.article.id)
    return this.article.getComments(page, amount, reader);
  }

  add(userId: string, comment: CommentDto) {
    return this.article.addComment(userId, comment);
  }

}