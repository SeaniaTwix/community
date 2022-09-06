import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import type {ArticleDto} from '$lib/types/dto/article.dto';
import {isStringInteger} from '$lib/util';
import HttpStatus from 'http-status-codes';
import {parseInt} from 'lodash-es';
import {Board} from '$lib/community/board/server';
import {error} from '$lib/kit';

interface ListParams {
  best: boolean;
}

export async function GET({params, url, locals}: RequestEvent, {best}: Partial<ListParams> = {}): Promise<Response> {
  if (!params.id || !isStringInteger(params.id)) {
    throw error(HttpStatus.BAD_REQUEST);
  }

  const pageParam = url.searchParams.get('page') ?? '1';
  const amountParam = url.searchParams.get('amount') ?? '30';
  const type = best === true || url.searchParams.get('type') === 'best' ? 'best' : 'default';

  return json(await load(params.id, pageParam, amountParam, type, locals));
}

function load(id: string, pageParam: string, amountParam: string, type: 'default' | 'best', locals: App.Locals) {
  const page = isStringInteger(pageParam) ? parseInt(pageParam) : 1;
  const amount = isStringInteger(amountParam) ? parseInt(amountParam) : 30;
  const showImage = locals?.ui?.listType === 'gallery';

  const board = new Board(id);

  const pageRequest = new ListBoardRequest(board, page, amount, showImage);

  return board.render(pageRequest, type, locals);
}

export class ListBoardRequest {
  private readonly board: Board;

  constructor(board: string | Board,
              readonly page: number,
              private readonly amount: number,
              private readonly showImage: boolean) {
    if (this.amount > 50) {
      throw new Error('too many');
    }
    if (typeof board === 'string') {
      this.board = new Board(board);
    } else {
      this.board = board;
    }
  }

  getMaxPage() {
    return this.board.getMaxPage(this.amount);
  }

  getBestMaxPage() {
    return this.board.getMaxPage(this.amount, 1);
  }

  getListRecents(reader: string | null): Promise<ArticleDto[]> {
    return this.board.getRecentArticles(this.page, this.amount, reader, this.showImage);
  }

  getBestListRecents(reader: string | null): Promise<ArticleDto[]> {
    // todo: based on board setting minLike
    return this.board.getRecentArticles(this.page, this.amount, reader, this.showImage, 1);
  }
}