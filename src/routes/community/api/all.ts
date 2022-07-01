import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';

export async function get(_: RequestEvent): Promise<RequestHandlerOutput> {
  return {
    status: 200,
    body: {
      boards: await AllBoardRequest.get(),
    }
  }
}

class AllBoardRequest {
  static async get(): Promise<string[]> {
    const cursor = await db.query(aql`
      for board in boards
        filter board.pub == true
          return {id: board._key, name: board.name}`);

    return await cursor.all()
  }
}