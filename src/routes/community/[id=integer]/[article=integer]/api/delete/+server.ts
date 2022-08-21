import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {EUserRanks} from '$lib/types/user-ranks';
import {Article} from '$lib/community/article/server';

export async function DELETE({params, url, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return {
      status: HttpStatus.UNAUTHORIZED,
      body: {
        reason: 'please login and try again',
      },
    };
  }

  const {article} = params;
  const permanent = !!url.searchParams.get('permanant');

  const remover = new ArticleDeleteRequest(article);

  const isExists = await remover.isExists;
  const isAuthor = await remover.isAuthor(locals.user.uid);
  const isManager = locals.user.rank >= EUserRanks.Manager;
  if (!isExists || (!isAuthor && !isManager)) {
    return {
      status: HttpStatus.UNAUTHORIZED,
      body: {
        notExists: !isExists,
        notAuthor: !isAuthor,
        notManager: !isManager,
      }
    };
  }

  try {
    // permdel only allowed by Admin
    await remover.delete(locals.user.rank > EUserRanks.Manager && permanent);
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

class ArticleDeleteRequest {
  private readonly article: Article;

  constructor(articleId: string) {
    this.article = new Article(articleId);
  }

  get isExists() {
    return this.article.exists;
  }

  async isAuthor(userId: string): Promise<boolean> {
    try {
      const data = await this.article.get();
      return data.author === userId;
    } catch {
      return false;
    }
  }

  delete(permanant: boolean) {
    return this.article.delete(permanant);
  }
}