// noinspection DuplicatedCode

import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {Pusher} from '$lib/pusher/server';

export async function GET({params, locals, clientAddress, platform}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return {
      status: HttpStatus.UNAUTHORIZED,
    };
  }

  const {article, comment} = params;

  const commentVote = new CommentVoteRequest(comment);

  try {
    const result = await commentVote.myVote(locals.user.uid);
    return {
      status: HttpStatus.OK,
      body: {
        vote: result ?? 'undefined',
      },
    };
  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString(),
      },
    };
  }

}

const allowed = ['like', 'dislike'];
const error = (type?: string) => ({
  status: HttpStatus.BAD_REQUEST,
  body: {
    reason: !type ? 'type is required.' : 'type not allowed.',
  },
});
const errorCommentNotFound = {
  status: HttpStatus.NOT_FOUND,
  body: {
    reason: 'comment invalid',
  },
};
const errorUserNotSigned = {
  status: HttpStatus.UNAUTHORIZED,
  body: {
    reason: 'please login and try again',
  },
};

export async function PUT({params, url, locals, clientAddress, platform}: RequestEvent): Promise<RequestHandlerOutput> {
  const type = url.searchParams.get('type') ?? undefined;
  if (!type || !allowed.includes(type)) {
    return error(type);
  }

  if (!locals?.user?.uid) {
    return errorUserNotSigned;
  }

  const {id, article, comment} = params;

  const commentVote = new CommentVoteRequest(comment);

  try {
    if (!await commentVote.isCommentExists()) {
      return errorCommentNotFound;
    }

    if (await commentVote.isMyComment(locals.user.uid)) {
      return {
        status: HttpStatus.NOT_ACCEPTABLE,
        body: {
          reason: 'you can vote your self',
        },
      };
    }

    await commentVote.vote(locals.user.uid, type as any);
  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString(),
      },
    };
  }

  try {
    await Pusher.notify('comments:vote', `${article}@${id}`, '0' /*locals.user.uid*/, {
      comment,
      type,
      amount: 1,
    }).catch()
  } catch (e) {
    console.error(e);
  }

  return {
    status: HttpStatus.ACCEPTED,

  };
}

export async function DELETE({params, url, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const type = url.searchParams.get('type') ?? undefined;
  if (!type || !allowed.includes(type)) {
    return error(type);
  }

  if (!locals?.user?.uid) {
    return errorUserNotSigned;
  }


  const {id, article, comment} = params;

  const vote = new CommentVoteRequest(comment);

  try {
    if (!await vote.isCommentExists()) {
      return errorCommentNotFound;
    }

    await vote.withdrawal(locals.user.uid);
  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString(),
      },
    };
  }

  try {
    await Pusher.notify('comments:vote', `${article}@${id}`, '0' /*locals.user.uid*/, {
      comment,
      type,
      amount: -1,
    }).catch();
  } catch (e) {
    console.error(e);
  }

  return {
    status: HttpStatus.ACCEPTED,

  };
}


class CommentVoteRequest {
  constructor(private readonly commentId: string) {
  }

  async isMyComment(user: string): Promise<boolean> {
    try {
      const cursor = await db.query(aql`
        for comment in comments
          filter comment._key == ${this.commentId}
            return comment.author`);
      const userId = await cursor.next();
      return user === userId;
    } catch {
      return false;
    }
  }

  async myVote(user: string): Promise<'like' | 'dislike' | undefined> {
    try {
      const cursor = await db.query(aql`
        for comment in comments
          filter comment._key == ${this.commentId}
            return comment[${user}].type`);
      return await cursor.next();
    } catch {
      return undefined;
    }
  }

  async isCommentExists(): Promise<boolean> {
    try {
      const cursor = await db.query(aql`
      for comment in comments
        filter comment._key == ${this.commentId}
          return comment`);
      return cursor.hasNext;
    } catch {
      return false;
    }
  }

  async vote(userId: string, type: 'like' | 'dislike') {
    const newVote = {
      [userId]: {type, createdAt: new Date},
    };
    console.log(newVote);

    await db.query(aql`
      for comment in comments
        filter comment._key == ${this.commentId}
          let votes = is_object(comment.votes) ? comment.votes : {}
          update comment with {
            votes: merge_recursive(votes, ${newVote})
          } in comments`);
  }

  async withdrawal(userId: string) {
    await db.query(aql`
      for comment in comments
        filter comment._key == ${this.commentId}
          let newVotes = unset(is_object(comment.vote) ? comment.vote : {}, ${userId})
          update comment with {votes: newVotes} in comments`);
  }

}