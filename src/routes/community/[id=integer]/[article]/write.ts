import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import _ from 'lodash-es';
import HttpStatus from 'http-status-codes';
import db from '$lib/database/instance';
import { aql } from 'arangojs/aql';
import {BoardManager} from '../../../../lib/community/board';

export async function post({request}: RequestEvent): Promise<RequestHandlerOutput> {
  const write = new WriteRequst(await request.json());

  return {

  }
}

class WriteRequst {
  error: string | null = null;
  private board: BoardManager;

  constructor(private body: Rec<string>) {
    if (this.isTitleEmpty || this.isBodyEmpty) {
      this.error = 'some field is empty';
    }

    this.board = new BoardManager(this.boardId);
  }

  get boardId(): string {
    return this.body.id.toString()
  }

  private get isBoardExists(): Promise<boolean> {
    return this.board.exists;
  }

  get isTitleEmpty(): boolean {
    return _.isEmpty(this.body.title);
  }

  get isBodyEmpty(): boolean {
    return _.isEmpty(this.body.body);
  }

  async saveToDB() {
    if (await this.isBoardExists) {
      this.error = 'board not exsists'
      return;
    }

    return await db.query(aql`insert to articles`);
  }

  get status(): number {
    return _.isEmpty(this.error) ? HttpStatus.CREATED : HttpStatus.BAD_REQUEST;
  }
}