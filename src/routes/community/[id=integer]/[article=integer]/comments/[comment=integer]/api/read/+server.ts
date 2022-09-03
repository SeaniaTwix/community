import { json } from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import {Comment} from '$lib/community/comment/server';
import HttpStatus from 'http-status-codes';
import {error} from '$lib/kit';

export async function GET({params, request, locals}: RequestEvent): Promise<Response> {
  const {comment} = params;

  if (!comment) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const res = new CommentSpecificRequest(comment);
  console.log(res);

  if (!await res.exists()) {
    return new Response(undefined, { status: HttpStatus.NOT_FOUND });
  }

  return json({
  content: await res.content(),
}, {
    status: HttpStatus.OK
  });
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