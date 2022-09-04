import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import {EUserRanks} from '$lib/types/user-ranks';
import HttpStatus from 'http-status-codes';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {isStringInteger} from '$lib/util';
import {toInteger} from 'lodash-es';
import {error} from '$lib/kit';

export async function GET({locals, url: {searchParams}}: RequestEvent): Promise<Response> {
  if (!locals.user || locals.user.rank <= EUserRanks.User) {
    throw error(HttpStatus.UNAUTHORIZED);
  }

  const paramPage = searchParams.get('page') ?? '1';
  const page = isStringInteger(paramPage) ? toInteger(paramPage) : 1;
  const paramAmount = searchParams.get('amount') ?? '20';
  const amount = Math.max(
    isStringInteger(paramAmount) ? toInteger(paramAmount) : 20, 20);
  const userList = new UsersListRequest(locals.user.uid);

  return json({
    users: await userList.listAll(page, amount),
  });

}

class UsersListRequest {
  constructor(private readonly instigatorId: string) {
  }

  async listAll(page = 1, amount = 20) {
    const cursor = await db.query(aql`
      for user in users
        limit ${(page - 1) * amount}, ${amount}
        return unset(user, "password", "_id", "_rev", "blockedUsers", "blockedTags")`);
    return await cursor.all();
  }
}