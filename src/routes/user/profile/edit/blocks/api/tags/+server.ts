import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {isArray, isEmpty, isString} from 'lodash-es';
import {error} from '$lib/kit';

const invalidUserError = {
  status: HttpStatus.UNAUTHORIZED,
  reason: 'please login and retry',
};

const invalidTagNamesError = {
  status: HttpStatus.BAD_REQUEST,
  reason: 'tagNames must be string array and not empty',
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

  const tag = new TagBlockRequest(user);

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

  const {tagNames} = await request.json() as { tagNames: string[] };

  if (!isArray(tagNames) || (isArray(tagNames) && isEmpty(tagNames))) {
    throw error(invalidTagNamesError.status, invalidTagNamesError.reason);
  }

  const user = await User.findByUniqueId(locals.user.uid);
  if (!user) {
    throw error(invalidUserError.status, invalidUserError.reason);
  }

  const block = new TagBlockRequest(user);

  try {
    await block.add(tagNames.map(tag => tag.trim()).filter(tag => isString(tag) && !isEmpty(tag)));
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }

  return new Response(undefined, {status: HttpStatus.ACCEPTED});
}

// remove tag blocks
export async function DELETE({locals, request}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    throw error(invalidUserError.status, invalidUserError.reason);
  }

  const {tagNames} = await request.json() as { tagNames: string[] };

  if (!isArray(tagNames) || (isArray(tagNames) && isEmpty(tagNames))) {
    throw error(invalidTagNamesError.status, invalidTagNamesError.reason);
  }

  const user = await User.findByUniqueId(locals.user.uid);
  if (!user) {
    throw error(invalidUserError.status, invalidUserError.reason);
  }

  const block = new TagBlockRequest(user);

  try {
    await block.remove(tagNames.map(tag => tag.trim()).filter(tag => isString(tag) && !isEmpty(tag)));
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }

  return new Response(undefined, {status: HttpStatus.ACCEPTED});
}

class TagBlockRequest {
  constructor(private readonly user: User) {
  }

  add(tags: string[]) {
    return this.user.blockTags(tags);
  }

  remove(tags: string[]) {
    return this.user.removeBlockedTags(tags);
  }

  getAll() {
    return this.user.getBlockedTags();
  }
}