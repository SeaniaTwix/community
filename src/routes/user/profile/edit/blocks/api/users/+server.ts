import { json as json$1 } from '@sveltejs/kit';
// noinspection DuplicatedCode

import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {isArray, isEmpty, isString} from 'lodash-es';
import {isStringInteger} from '$lib/util';
import {EUserRanks} from '$lib/types/user-ranks';

const invalidUserError: RequestHandlerOutput = {
  status: HttpStatus.UNAUTHORIZED,
  body: {
    reason: 'please login and retry',
  },
};

const invalidUserIdError: RequestHandlerOutput = {
  status: HttpStatus.BAD_REQUEST,
  body: {
    reason: 'some user not exists',
  },
};

// get blocked list
export async function GET({locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return invalidUserError;
  }

  const user = await User.findByUniqueId(locals.user.uid);
  if (!user) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return invalidUserError;
  }

  const tag = new UserBlockRequest(user);

  return json$1({
  blocked: await tag.getAll(),
}, {
    status: HttpStatus.OK
  });
}

// add tag blocks
export async function POST({locals, request}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return invalidUserError;
  }

  const {user: userId, reason} = await request.json() as { user: string, reason: string };

  if (!isStringInteger(userId)) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return invalidUserIdError;
  }

  const user = await User.findByUniqueId(locals.user.uid);
  if (!user) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return invalidUserError;
  }

  const target = await User.findByUniqueId(userId.trim());
  if (!target) {
    return json$1({
  reason: 'target is not found',
}, {
      status: HttpStatus.NOT_FOUND
    });
  }

  if (await target.rank >= EUserRanks.Manager) {
    return json$1({
  reason: 'you cannot block manager and admin',
}, {
      status: HttpStatus.NOT_ACCEPTABLE
    });
  }

  const block = new UserBlockRequest(user);

  try {
    await block.add(await target.uid, reason);
  } catch (e: any) {
    return json$1({
  reason: e.toString(),
}, {
      status: HttpStatus.BAD_GATEWAY
    });
  }

  return new Response(undefined, { status: HttpStatus.ACCEPTED });
}

// remove tag blocks
export async function DELETE({locals, request}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return invalidUserError;
  }

  const {userIds} = await request.json() as { userIds: string[] };

  if (!isArray(userIds) || (isArray(userIds) && isEmpty(userIds))) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return invalidUserIdError;
  }

  const user = await User.findByUniqueId(locals.user.uid);
  if (!user) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return invalidUserError;
  }

  const block = new UserBlockRequest(user);

  try {
    await block.remove(userIds.map(tag => tag.trim()).filter(tag => isString(tag) && !isEmpty(tag)));
  } catch (e: any) {
    return json$1({
  reason: e.toString(),
}, {
      status: HttpStatus.BAD_GATEWAY
    });
  }

  return new Response(undefined, { status: HttpStatus.ACCEPTED });
}

class UserBlockRequest {
  constructor(private readonly user: User) {
  }

  add(target: string, reason: string) {
    return this.user.blockUser(target, reason);
  }

  remove(userIds: string[]) {
    return this.user.removeBlockedUsers(userIds);
  }

  getAll() {
    return this.user.getBlockedUsers();
  }
}