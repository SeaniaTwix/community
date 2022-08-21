import { json as json$1 } from '@sveltejs/kit';
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {isArray, isEmpty, isString} from 'lodash-es';

const invalidUserError: RequestHandlerOutput = {
  status: HttpStatus.UNAUTHORIZED,
  body: {
    reason: 'please login and retry',
  },
};

const invalidTagNamesError: RequestHandlerOutput = {
  status: HttpStatus.BAD_REQUEST,
  body: {
    reason: 'tagNames must be string array and not empty'
  }
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

  const tag = new TagBlockRequest(user);

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

  const {tagNames} = await request.json() as {tagNames: string[]};

  if (!isArray(tagNames) || (isArray(tagNames) && isEmpty(tagNames))) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return invalidTagNamesError
  }

  const user = await User.findByUniqueId(locals.user.uid);
  if (!user) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return invalidUserError;
  }

  const block = new TagBlockRequest(user);

  try {
    await block.add(tagNames.map(tag => tag.trim()).filter(tag => isString(tag) && !isEmpty(tag)));
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

  const {tagNames} = await request.json() as {tagNames: string[]};

  if (!isArray(tagNames) || (isArray(tagNames) && isEmpty(tagNames))) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return invalidTagNamesError
  }

  const user = await User.findByUniqueId(locals.user.uid);
  if (!user) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return invalidUserError;
  }

  const block = new TagBlockRequest(user);

  try {
    await block.remove(tagNames.map(tag => tag.trim()).filter(tag => isString(tag) && !isEmpty(tag)));
  } catch (e: any) {
    return json$1({
  reason: e.toString(),
}, {
      status: HttpStatus.BAD_GATEWAY
    });
  }

  return new Response(undefined, { status: HttpStatus.ACCEPTED });
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