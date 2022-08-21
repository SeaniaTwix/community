import { json } from '@sveltejs/kit';
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {Article} from '$lib/community/article/server';

export async function GET({params, }: RequestEvent): Promise<RequestHandlerOutput> {
  const {article} = params;
  const info = new ArticleInfoRequest(article);

  if (!await info.exists()) {
    return new Response(undefined, { status: HttpStatus.NOT_FOUND })
  }

  const data = await info.data();

  const body = {
    title: data.title,
    content: data.content,
  }

  throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
  // Suggestion (check for correctness before using):
  // return json(body, {
  //   status: HttpStatus.OK
  // });
  return {
    status: HttpStatus.OK,
    body,
  }
}

class ArticleInfoRequest {
  private article: Article
  constructor(articleId: string) {
    this.article = new Article(articleId);
  }

  exists() {
    return this.article.exists;
  }

  data() {
    return this.article.get();
  }
}