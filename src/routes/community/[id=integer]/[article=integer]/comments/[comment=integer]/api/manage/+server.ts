import {json as json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {Comment} from '$lib/community/comment/server';
import {EUserRanks} from '$lib/types/user-ranks';
import {Pusher} from '$lib/pusher/server';
import {sanitize} from '$lib/community/comment/client';
import {error} from '$lib/kit';

const noPermisionError = {
  status: HttpStatus.UNAUTHORIZED,
  reason: 'you have no permission of this action',
};

// noinspection JSUnusedGlobalSymbols
export async function PATCH({params, request, locals}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    throw error(noPermisionError.status, noPermisionError.reason);
  }

  const {comment} = params;

  if (!comment) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const manage = new ManageCommentRequest(comment);

  if (!await manage.isAuthor(locals.user.uid)) {
    throw error(HttpStatus.NOT_ACCEPTABLE, 'you are not author');
  }

  let newContent: string;
  try {
    const {content} = await request.json() as { content: string };

    newContent = await manage.edit(content);
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }

  return json({
    newContent,
  }, {
    status: HttpStatus.ACCEPTED,
  });
}

// noinspection JSUnusedGlobalSymbols
export async function DELETE({params, url, locals}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    throw error(noPermisionError.status, noPermisionError.reason);
  }

  const {id, article, comment} = params;

  if (!id || !article || !comment) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  // console.log(params)
  const p = url.searchParams.get('permanant') ?? 'no';
  const permanantly = p === 'yes';

  const uid = locals.user.uid;
  const rank = locals.user.rank;
  const isAdmin = rank >= EUserRanks.Manager;

  if (permanantly && !isAdmin) {
    throw error(noPermisionError.status, noPermisionError.reason);
  }

  const manage = new ManageCommentRequest(comment);

  if (!await manage.exists()) {
    throw error(HttpStatus.NOT_FOUND, 'comment not exists');
  }

  const isAuthorsRequest = await manage.isAuthor(uid);
  if (!isAuthorsRequest && !isAdmin) {
    throw error(noPermisionError.status, noPermisionError.reason);
  }

  try {
    if (permanantly) {
      await manage.del();
    } else {
      await manage.unpub();
    }
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }

  Pusher.notify('comments', `${article}@${id}`, uid, {
    type: 'del',
    target: params.comment,
  }).then();

  return new Response(undefined, {status: HttpStatus.ACCEPTED});
}

class ManageCommentRequest {
  private readonly comment: Comment;

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

  async edit(newContent: string) {
    const content = await sanitize(newContent);

    await this.comment.edit(content);

    return content;
  }

  unpub(): Promise<any> {
    // console.log(this.comment);
    return this.comment.unpub();
  }

  del(): Promise<any> {
    return this.comment.del();
  }

}