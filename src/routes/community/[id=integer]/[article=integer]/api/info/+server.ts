import { json } from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {Article} from '$lib/community/article/server';
import {error} from '$lib/kit';

export async function GET({params, }: RequestEvent): Promise<Response> {
  const {article} = params;

  if (!article) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const info = new ArticleInfoRequest(article);

  if (!await info.exists()) {
    throw error(HttpStatus.NOT_FOUND);
  }

  const data = await info.data();

  const body = {
    title: data.title,
    content: data.content,
  }

  return json(body);
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