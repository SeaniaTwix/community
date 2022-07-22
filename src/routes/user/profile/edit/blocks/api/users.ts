// noinspection DuplicatedCode

import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {isArray, isEmpty, isString} from 'lodash-es';
import {isStringInteger} from '$lib/util';
import {EUserRanks} from '../../../../../../lib/types/user-ranks';

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
    return invalidUserError;
  }

  const user = await User.findByUniqueId(locals.user.uid);
  if (!user) {
    return invalidUserError;
  }

  const tag = new UserBlockRequest(user);

  return {
    status: HttpStatus.OK,
    body: {
      blocked: await tag.getAll(),
    },
  };
}

// add tag blocks
export async function POST({locals, request}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return invalidUserError;
  }

  const {user: userId, reason} = await request.json() as { user: string, reason: string };

  if (!isStringInteger(userId)) {
    return invalidUserIdError;
  }

  const user = await User.findByUniqueId(locals.user.uid);
  if (!user) {
    return invalidUserError;
  }

  const target = await User.findByUniqueId(userId.trim());
  if (!target) {
    return {
      status: HttpStatus.NOT_FOUND,
      body: {
        reason: 'target is not found',
      },
    };
  }

  if (await target.rank >= EUserRanks.Manager) {
    return {
      status: HttpStatus.NOT_ACCEPTABLE,
      body: {
        reason: 'you cannot block manager and admin',
      },
    };
  }

  const block = new UserBlockRequest(user);

  try {
    await block.add(await target.uid, reason);
  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString(),
      },
    };
  }

  return {
    status: HttpStatus.ACCEPTED,
  };
}

// remove tag blocks
export async function DELETE({locals, request}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return invalidUserError;
  }

  const {userIds} = await request.json() as { userIds: string[] };

  if (!isArray(userIds) || (isArray(userIds) && isEmpty(userIds))) {
    return invalidUserIdError;
  }

  const user = await User.findByUniqueId(locals.user.uid);
  if (!user) {
    return invalidUserError;
  }

  const block = new UserBlockRequest(user);

  try {
    await block.remove(userIds.map(tag => tag.trim()).filter(tag => isString(tag) && !isEmpty(tag)));
  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString(),
      },
    };
  }

  return {
    status: HttpStatus.ACCEPTED,
  };
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