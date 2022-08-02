import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {Comment} from '$lib/community/comment/server';
import HttpStatus from 'http-status-codes';

export async function GET({params, request, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const {comment} = params;

  const res = new CommentSpecificRequest(comment);
  console.log(res);

  if (!await res.exists()) {
    return {
      status: HttpStatus.NOT_FOUND,
    };
  }

  return {
    status: HttpStatus.OK,
    body: {
      content: await res.content(),
    },
  };
}

class CommentSpecificRequest {
  private readonly comment: Comment;

  constructor(commandId: string) {
    this.comment = new Comment(commandId);
  }

  exists() {
    return this.comment.exists();
  }

  async content() {
    const data = await this.comment.get();
    return data.content;
  }
}