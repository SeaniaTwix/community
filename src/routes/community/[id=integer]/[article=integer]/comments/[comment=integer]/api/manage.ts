import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {Comment} from '$lib/community/comment/server';
import {EUserRanks} from '$lib/types/user-ranks';
import {Pusher} from '$lib/pusher/server';

const noPermisionError: RequestHandlerOutput = {
  status: HttpStatus.NOT_ACCEPTABLE,
  body: {
    reason: 'you have no permission of this action',
  },
};

export async function DELETE({params, url, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return noPermisionError;
  }

  const {id, article, comment} = params;
  console.log(params)
  const p = url.searchParams.get('permanant') ?? 'no';
  const permanantly = p === 'yes';

  const uid = locals.user.uid;
  const rank = locals.user.rank;
  const isAdmin = rank >= EUserRanks.Manager

  if (permanantly && !isAdmin) {
    return noPermisionError;
  }

  const manage = new ManageCommentRequest(comment);

  try {
    if (!await manage.exists()) {
      return {
        status: HttpStatus.NOT_FOUND,
        body: {
          reason: 'comment not exists',
        }
      }
    }

    const isAuthorsRequest = await manage.isAuthor(uid);
    if (!isAuthorsRequest && !isAdmin) {
      return noPermisionError;
    }

    if (permanantly) {
      await manage.del();
    } else {
      await manage.unpub();
    }

    Pusher.notify('comments', `${article}@${id}`, uid, {
      type: 'del',
      target: params.comment,
    }).then();

  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString()
      }
    }
  }

  return {
    status: HttpStatus.ACCEPTED,
  }
}

class ManageCommentRequest {
  private readonly comment: Comment
  constructor(private readonly commentId: string) {
    this.comment = new Comment(commentId);
  }

  async isAuthor(userId: string) {
    const data = await this.comment.get();
    return data.author === userId;
  }

  exists(): Promise<boolean> {
    return this.comment.exists();
  }

  unpub(): Promise<any> {
    console.log(this.comment);
    return this.comment.unpub();
  }

  del(): Promise<any> {
    return this.comment.del();
  }

}