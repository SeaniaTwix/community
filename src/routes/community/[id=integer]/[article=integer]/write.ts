import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import _ from 'lodash-es';
import HttpStatus from 'http-status-codes';
import db from '$lib/database/instance';
import { aql } from 'arangojs/aql';
import {BoardManager} from '$lib/community/board';
import {ArticleDto} from '$lib/types/dto/article.dto';

// noinspection JSUnusedGlobalSymbols
export async function post({request, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const article = new ArticleDto(await request.json())
  const write = new WriteRequest(article);

  try {
    await write.saveToDB()
  } catch (e: any) {
    return {
      status: HttpStatus.FORBIDDEN,
      body: {
        reason: e.toString(),
      }
    }
  }

  return {
    status: write.status,
    body: {
      aid: write.id,
    }
  }
}

class WriteRequest {
  error: string | null = null;
  id?: string
  private board: BoardManager;

  constructor(private body: ArticleDto) {
    if (this.isTitleEmpty || this.isContentEmpty) {
      this.error = 'some field is empty';
    }

    this.board = new BoardManager(this.boardId);
  }

  get boardId(): string | undefined {
    return this.body.bid
  }

  get title(): string | undefined {
    return this.body.title
  }

  get content(): string | undefined {
    return this.body.content
  }

  private get isBoardExists(): Promise<boolean> {
    return this.board.exists;
  }

  get isTitleEmpty(): boolean {
    return _.isEmpty(this.title);
  }

  get isContentEmpty(): boolean {
    return _.isEmpty(this.content);
  }

  async saveToDB() {
    if (await this.isBoardExists) {
      this.error = 'board not exsists'
      return;
    }

    return await db.query(aql`
      insert ${{title: this.title, content: this.content}} into articles`);
  }

  get status(): number {
    return _.isEmpty(this.error) ? HttpStatus.CREATED : HttpStatus.BAD_REQUEST;
  }
}