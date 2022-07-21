import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {Article} from '$lib/community/article/server';

export async function GET({params, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const {article} = params;
  const info = new ArticleInfoRequest(article);

  if (!await info.exists()) {
    return {
      status: HttpStatus.NOT_FOUND,
    }
  }

  const data = await info.data();

  const body = {
    title: data.title,
    content: data.content,
  }

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