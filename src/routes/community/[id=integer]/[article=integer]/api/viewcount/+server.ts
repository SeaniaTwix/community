import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {Article} from '$lib/community/article/server';

/*
  DEPRECATED!
 */
export async function PUT(): Promise<Response> {
  return new Response(undefined, { status: HttpStatus.ACCEPTED })
}

export class AddViewCountRequest {
  private article: Article
  constructor(private readonly articleId: string) {
    this.article = new Article(this.articleId);
  }

  isArticleExists() {
    return this.article.exists;
  }

  async read(reader: string) {
    if (!await this.article.isAlreadyRead(reader)) {
      await this.article.addViewCount(reader);
    }
    await this.article.updateViewInfo(reader);
  }
}