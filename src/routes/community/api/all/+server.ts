import {json} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';

export async function GET(): Promise<Response> {
  return json({
    boards: await AllBoardRequest.get(),
  });
}

class AllBoardRequest {
  static async get(): Promise<string[]> {
    const cursor = await db.query(aql`
      for board in boards
        filter board.pub == true
          return {id: board._key, name: board.name}`);

    return await cursor.all();
  }
}