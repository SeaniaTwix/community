import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {Article} from '$lib/community/article/server';

export async function PUT({params}: RequestEvent): Promise<RequestHandlerOutput> {
  const viewCount = new AddViewCountRequest(params.article);

  if (!await viewCount.isArticleExists()) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: 'article not exists',
      }
    }
  }

  await viewCount.add();

  return {
    status: HttpStatus.ACCEPTED,
  }
}

class AddViewCountRequest {
  private article: Article
  constructor(private readonly articleId: string) {
    this.article = new Article(this.articleId);
  }

  isArticleExists() {
    return this.article.exists;
  }

  add() {
    return this.article.addViewCount();
  }
}