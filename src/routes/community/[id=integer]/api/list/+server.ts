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

export async function retrive({params, url, locals}: RequestEvent, {best}: Partial<ListParams> = {}) {
  if (!params.id || !isStringInteger(params.id)) {
    throw error(HttpStatus.BAD_REQUEST);
  }

  const pageParam = url.searchParams.get('page') ?? '1';
  const amountParam = url.searchParams.get('amount') ?? '30';
  const type = best === true || url.searchParams.get('type') === 'best' ? 'best' : 'default';
  const query = url.searchParams.get('q');

  return await load({
    page: pageParam,
    amount: amountParam,
    id: params.id,
    type,
    locals,
    query,
  });
}

export async function GET(event: RequestEvent, listParams: Partial<ListParams> = {}): Promise<Response> {
  return json(await retrive(event, listParams));
}

function toSafeNumber(i?: string | number, def = 1): number {
  if (!i) {
    return def;
  }

  return isStringInteger(i as string) ? parseInt(i as string) : i as number;
}

function load(option: ISearchServerParams) {
  const page = toSafeNumber(option.page);
  const amount = toSafeNumber(option.amount, 30);
  const showImage = option.locals?.ui?.listType === 'gallery';

  const board = new Board(option.id);

  const pageRequest = new ListBoardRequest(board, page, amount, showImage);

  return board.render(pageRequest, option.type, option.locals, option.query ?? undefined);
}

export interface ISearchServerParams {
  id: string;
  page: number | string;
  amount: number | string;
  type: 'default' | 'best';
  locals: App.Locals;
  query: string | null;
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

  getListRecents(reader: string | null, query?: string): Promise<ArticleDto[]> {
    return this.board.getRecentArticles(this.page, this.amount, reader, this.showImage, null, query);
  }

  async getBestListRecents(reader: string | null, query?: string): Promise<ArticleDto[]> {
    // todo: based on board setting minLike
    const minReqLikes = await this.board.minReqLikes;
    return await this.board.getRecentArticles(this.page, this.amount, reader, this.showImage, minReqLikes, query);
  }
}