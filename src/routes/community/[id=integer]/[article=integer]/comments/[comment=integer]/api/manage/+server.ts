import { json as json$1 } from '@sveltejs/kit';
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {Comment} from '$lib/community/comment/server';
import {EUserRanks} from '$lib/types/user-ranks';
import {Pusher} from '$lib/pusher/server';
import {sanitize} from '$lib/community/comment/client';

const noPermisionError: RequestHandlerOutput = {
  status: HttpStatus.NOT_ACCEPTABLE,
  body: {
    reason: 'you have no permission of this action',
  },
};

export async function PATCH({params, request, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return noPermisionError;
  }

  const {comment} = params;

  const manage = new ManageCommentRequest(comment);

  if (!await manage.isAuthor(locals.user.uid)) {
    return json$1({
  reason: 'you are not author',
}, {
      status: HttpStatus.NOT_ACCEPTABLE
    });
  }

  let newContent: string;
  try {
    const {content} = await request.json() as { content: string };

    newContent = await manage.edit(content);
  } catch (e: any) {
    return json$1({
  reason: e.toString(),
}, {
      status: HttpStatus.BAD_GATEWAY
    });
  }

  return json$1({
  newContent,
}, {
    status: HttpStatus.ACCEPTED
  });
}

export async function DELETE({params, url, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return noPermisionError;
  }

  const {id, article, comment} = params;
  // console.log(params)
  const p = url.searchParams.get('permanant') ?? 'no';
  const permanantly = p === 'yes';

  const uid = locals.user.uid;
  const rank = locals.user.rank;
  const isAdmin = rank >= EUserRanks.Manager;

  if (permanantly && !isAdmin) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return noPermisionError;
  }

  const manage = new ManageCommentRequest(comment);

  try {
    if (!await manage.exists()) {
      return json$1({
  reason: 'comment not exists',
}, {
        status: HttpStatus.NOT_FOUND
      });
    }

    const isAuthorsRequest = await manage.isAuthor(uid);
    if (!isAuthorsRequest && !isAdmin) {
      throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
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
    return json$1({
  reason: e.toString(),
}, {
      status: HttpStatus.BAD_GATEWAY
    });
  }

  return new Response(undefined, { status: HttpStatus.ACCEPTED });
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