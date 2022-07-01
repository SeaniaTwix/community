import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {BoardDto} from '$lib/types/dto/board.dto';
import db from '$lib/database/instance';
import {aql} from 'arangojs/aql';

/**
 * 게시판 생성
 */

export async function post({request}: RequestEvent): Promise<RequestHandlerOutput> {
  const body = new BoardDto(await request.json());
  const board = new AddBoardRequest(body);

  const id = await board.create();

  return {
    status: 201,
    body: {
      id,
    }
  }

}

class AddBoardRequest {
  constructor(private readonly body: BoardDto) {
  }

  get name(): string {
    return this.body.name!
  }

  get pub(): boolean {
    return this.body.pub;
  }

  get order(): number | undefined {
    return this.body.order;
  }

  /**
   * return 게시판 uid 값
   */
  async create(): Promise<string> {
    if (this.order) {
      const data = {
        name: this.name,
        pub: this.pub,
        order: this.order,
      };

      const cursor = await db.query(aql`
        insert ${data} into boards return NEW`);
      const {_key} = await cursor.next();
      return _key;
    } else {
      const data = {
        name: this.name,
        pub: this.pub,
      };
      const cursor = await db.query(aql`
        let l = length(boards)
        insert merge(${{...data}}, {order: l}) into boards return NEW`);
      const {_key} = await cursor.next();
      return _key;
    }
  }

}