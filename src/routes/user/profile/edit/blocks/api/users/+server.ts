import {json} from '@sveltejs/kit';
// noinspection DuplicatedCode

import type {RequestEvent} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {isArray, isEmpty, isString} from 'lodash-es';
import {isStringInteger} from '$lib/util';
import {EUserRanks} from '$lib/types/user-ranks';
import {error} from '$lib/kit';

const invalidUserError = {
  status: HttpStatus.UNAUTHORIZED,
  reason: 'please login and retry',
};

const invalidUserIdError = {
  status: HttpStatus.BAD_REQUEST,
  reason: 'some user not exists',
};

// get blocked list
export async function GET({locals}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    throw error(invalidUserError.status, invalidUserError.reason);
  }

  const user = await User.findByUniqueId(locals.user.uid);
  if (!user) {
    throw error(invalidUserError.status, invalidUserError.reason);
  }

  const tag = new UserBlockRequest(user);

  return json({
    blocked: await tag.getAll(),
  }, {
    status: HttpStatus.OK,
  });
}

// add tag blocks
export async function POST({locals, request}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    throw error(invalidUserError.status, invalidUserError.reason);
  }

  const {user: userId, reason} = await request.json() as { user: string, reason: string };

  if (!isStringInteger(userId)) {
    throw error(invalidUserIdError.status, invalidUserIdError.reason);
  }

  const user = await User.findByUniqueId(locals.user.uid);
  if (!user) {
    throw error(invalidUserError.status, invalidUserError.reason);
  }

  const target = await User.findByUniqueId(userId.trim());
  if (!target) {
    return json({
      reason: 'target is not found',
    }, {
      status: HttpStatus.NOT_FOUND,
    });
  }

  if (await target.rank >= EUserRanks.Manager) {
    return json({
      reason: 'you cannot block manager and admin',
    }, {
      status: HttpStatus.NOT_ACCEPTABLE,
    });
  }

  const block = new UserBlockRequest(user);

  try {
    await block.add(await target.uid, reason);
  } catch (e: any) {
    return json({
      reason: e.toString(),
    }, {
      status: HttpStatus.BAD_GATEWAY,
    });
  }

  return new Response(undefined, {status: HttpStatus.ACCEPTED});
}

// remove tag blocks
export async function DELETE({locals, request}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    throw error(invalidUserError.status, invalidUserError.reason);
  }

  const {userIds} = await request.json() as { userIds: string[] };

  if (!isArray(userIds) || (isArray(userIds) && isEmpty(userIds))) {
    throw error(invalidUserIdError.status, invalidUserIdError.reason);
  }

  const user = await User.findByUniqueId(locals.user.uid);
  if (!user) {
    throw error(invalidUserError.status, invalidUserError.reason);
  }

  const block = new UserBlockRequest(user);

  try {
    await block.remove(userIds.map(tag => tag.trim()).filter(tag => isString(tag) && !isEmpty(tag)));
  } catch (e: any) {
    return json({
      reason: e.toString(),
    }, {
      status: HttpStatus.BAD_GATEWAY,
    });
  }

  return new Response(undefined, {status: HttpStatus.ACCEPTED});
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