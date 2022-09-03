import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {EUserRanks} from '$lib/types/user-ranks';
import {Article} from '$lib/community/article/server';
import {error} from '$lib/kit';

// noinspection JSUnusedGlobalSymbols
export async function DELETE({params, url, locals}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    return json({
      reason: 'please login and try again',
    }, {
      status: HttpStatus.UNAUTHORIZED,
    });
  }

  const {article} = params;

  if (!article) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const permanent = !!url.searchParams.get('permanant');

  const remover = new ArticleDeleteRequest(article);

  const isExists = await remover.isExists;
  const isAuthor = await remover.isAuthor(locals.user.uid);
  const isManager = locals.user.rank >= EUserRanks.Manager;
  if (!isExists || (!isAuthor && !isManager)) {
    return json({
      notExists: !isExists,
      notAuthor: !isAuthor,
      notManager: !isManager,
    }, {
      status: HttpStatus.UNAUTHORIZED,
    });
  }

  try {
    // permdel only allowed by Admin
    await remover.delete(locals.user.rank > EUserRanks.Manager && permanent);
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }

  return new Response(undefined, {status: HttpStatus.ACCEPTED});
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