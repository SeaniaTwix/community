import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import type {ArticleDto} from '$lib/types/dto/article.dto';
import {isStringInteger} from '$lib/util';
import HttpStatus from 'http-status-codes';
import {parseInt} from 'lodash-es';
import {Board} from '$lib/community/board/server';

export async function GET({params, url, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!isStringInteger(params.id)) {
    return {
      status: HttpStatus.BAD_REQUEST,
    };
  }

  const board = new ListBoardRequest(params.id);
  const pageParam = url.searchParams.get('page') ?? '1';
  const page = isStringInteger(pageParam) ? parseInt(pageParam) : 1;
  const amountParam = url.searchParams.get('amount') ?? '30';
  const amount = isStringInteger(amountParam) ? parseInt(amountParam) : 30;
  const type: 'default' | 'best' = url.searchParams.get('type') !== 'best' ? 'default' : 'best';
  const showImage = locals.ui.listType === 'gallery';
  const list = type === 'default' ?
    await board.getListRecents(page, amount, locals?.user?.uid ?? null, showImage) as any[]
  : await board.getBestListRecents(page, amount, locals?.user?.uid ?? null, showImage) as any[];

  // todo: find diff way for mapping tags count (in aql if available)

  return {
    status: 200,
    body: {
      list: list.map(article => {
        const tags: Record<string, number> = {};
        for (const tagName of article.tags) {
          tags[tagName] = Object.hasOwn(tags, tagName) ? tags[tagName] + 1 : 1;
        }
        article.tags = tags;

        if (Object.keys(tags).includes('성인') && showImage && locals?.user?.adult !== true) {
          article.images = '';
        }

        return article;
      }),
      maxPage: type === 'default' ? await board.getMaxPage(amount) : await board.getBestMaxPage(amount),
    },
  };
}

class ListBoardRequest {
  private readonly board: Board;

  constructor(id: string) {
    this.board = new Board(id);
  }

  getMaxPage(amount: number) {
    return this.board.getMaxPage(amount);
  }

  getBestMaxPage(amount: number) {
    return this.board.getMaxPage(amount, 1);
  }

  getListRecents(page = 1, amount = 25, reader: string | null, showImage: boolean): Promise<ArticleDto[]> {
    if (amount > 50) {
      throw new Error('too many');
    }
    return this.board.getRecentArticles(page, amount, reader, showImage);
  }

  getBestListRecents(page = 1, amount = 25, reader: string | null, showImage: boolean): Promise<ArticleDto[]> {
    if (amount > 50) {
      throw new Error('too many');
    }
    // todo: based on board setting minLike
    return this.board.getRecentArticles(page, amount, reader, showImage, 1);
  }
}