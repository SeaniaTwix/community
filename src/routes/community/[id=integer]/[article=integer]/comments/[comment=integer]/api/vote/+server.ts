import {json} from '@sveltejs/kit';
// noinspection DuplicatedCode

import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {Pusher} from '$lib/pusher/server';
import {error} from '$lib/kit';

export async function GET({params, locals}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    return new Response(undefined, {status: HttpStatus.UNAUTHORIZED});
  }

  const {comment} = params;

  if (!comment) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const commentVote = new CommentVoteRequest(comment);

  try {
    const result = await commentVote.myVote(locals.user.uid);
    return json({
      vote: result ?? 'undefined',
    }, {
      status: HttpStatus.OK,
    });
  } catch (e: any) {
    return json({
      reason: e.toString(),
    }, {
      status: HttpStatus.BAD_GATEWAY,
    });
  }

}

const allowed = ['like', 'dislike'];
const error$1 = (type?: string) => ({
  status: HttpStatus.BAD_REQUEST,
  reason: !type ? 'type is required.' : 'type not allowed.',
});
const errorCommentNotFound = {
  status: HttpStatus.NOT_FOUND,
  reason: 'comment invalid',
};
const errorUserNotSigned = {
  status: HttpStatus.UNAUTHORIZED,
  reason: 'please login and try again',
};

// noinspection JSUnusedGlobalSymbols
export async function PUT({params, url, locals}: RequestEvent): Promise<Response> {
  const type = url.searchParams.get('type') ?? undefined;
  if (!type || !allowed.includes(type)) {
    const err = error$1(type);
    throw error(err.status, err.reason);
  }

  if (!locals?.user?.uid) {
    throw error(errorUserNotSigned.status, errorUserNotSigned.reason);
  }

  const {id, article, comment} = params;

  if (!comment) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const commentVote = new CommentVoteRequest(comment);

  if (!await commentVote.isCommentExists()) {
    throw error(errorCommentNotFound.status, errorCommentNotFound.reason);
  }

  if (await commentVote.isMyComment(locals.user.uid)) {
    throw error(HttpStatus.NOT_ACCEPTABLE, 'you can vote your self');
  }

  try {
    await commentVote.vote(locals.user.uid, type as any);
  } catch (e: any) {
    return json({
      reason: e.toString(),
    }, {
      status: HttpStatus.BAD_GATEWAY,
    });
  }

  try {
    await Pusher.notify('comments:vote', `${article}@${id}`, '0' /*locals.user.uid*/, {
      comment,
      type,
      amount: 1,
    }).catch();
  } catch (e) {
    console.error(e);
  }

  return new Response(undefined, {status: HttpStatus.ACCEPTED});
}

// noinspection JSUnusedGlobalSymbols
export async function DELETE({params, url, locals}: RequestEvent): Promise<Response> {
  const type = url.searchParams.get('type') ?? undefined;
  if (!type || !allowed.includes(type)) {
    const err = error$1(type);
    throw error(err.status, err.reason);
  }

  if (!locals?.user?.uid) {
    throw error(errorUserNotSigned.status, errorUserNotSigned.reason);
  }


  const {id, article, comment} = params;

  if (!comment) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const vote = new CommentVoteRequest(comment);

  if (!await vote.isCommentExists()) {
    throw error(errorCommentNotFound.status, errorCommentNotFound.reason);
  }

  const mv = await vote.myVote(locals.user.uid);
  if (!mv) {
    throw error(HttpStatus.NOT_ACCEPTABLE, 'not exists vote');
  }

  try {

    await vote.withdrawal(locals.user.uid);
  } catch (e: any) {
    return json({
      reason: e.toString(),
    }, {
      status: HttpStatus.BAD_GATEWAY,
    });
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

  return new Response(undefined, {status: HttpStatus.ACCEPTED});
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
            let votes = is_object(comment.votes) ? comment.votes : {}
            return votes[${user}].type`);
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
    // console.log(newVote);

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
          let v = is_object(comment.votes) ? comment.votes : {}
          let nv = unset(v, ${userId})
          let newCo = merge(comment, {votes: nv})
          replace comment with newCo in comments`);
  }

}