import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {Pusher} from '$lib/pusher/server';

export async function get({url, locals, clientAddress, platform}: RequestEvent): Promise<RequestHandlerOutput> {


  return {
    status: HttpStatus.CREATED,
  };
}

const allowed = ['like', 'dislike'];

export async function put({params, url, locals, clientAddress, platform}: RequestEvent): Promise<RequestHandlerOutput> {
  const type = url.searchParams.get('type');
  if (!type || !allowed.includes(type)) {
    return {
      status: HttpStatus.BAD_REQUEST,
      body: {
        reason: !type ? 'type is required.' : 'type not allowed.',
      },
    };
  }

  const {comments} = params;

  const comment = new CommentVoteRequest(comments);

  if (!await comment.exists()) {
    return {
      status: HttpStatus.NOT_FOUND,
      body: {
        reason: 'comment invalid',
      },
    };
  }

  if (!locals?.user?.uid) {
    return {
      status: HttpStatus.UNAUTHORIZED,
      body: {
        reason: 'please login and try again',
      },
    };
  }

  try {
    await comment.vote(locals.user.uid, type as any);
  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString(),
      },
    };
  }

  return {
    status: HttpStatus.ACCEPTED,

  };
}

class CommentVoteRequest {
  constructor(private readonly commentId: string) {
  }

  async exists(): Promise<boolean> {
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

    await db.query(aql`
      for comment in comments
        filter comment._key == ${this.commentId}
          let votes = is_object(comment.vote) ? comment.vote : {}
          update comment with merge_recursive(votes, ${newVote}) into comments`);

    Pusher.notify('comments:vote', this.commentId, userId, {

    });

  }
}