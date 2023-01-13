import type {ServerLoadEvent} from '@sveltejs/kit';
import HttpStatus from '$lib/http-status';
import type {PageData} from './$types';
import {redirect} from '$lib/kit';

import {GET as RequestTags} from '../api/users/+server';
import {User} from '$lib/auth/user/server';
import type {IUser} from '$lib/types/user';

export async function load({locals, url}: ServerLoadEvent): Promise<PageData> {
  if (!locals.user) {
    throw redirect(HttpStatus.MOVED_TEMPORARILY, '/login');
  }

  const requestTags = await RequestTags({locals} as any);
  const {blocked} = await requestTags.json() as {blocked: {key: string, reason: string}[]};

  const toBlockId = url.searchParams.get('id');
  const toBlockUser = toBlockId ? await (await User.findByUniqueId(toBlockId))?.safeData : undefined;

  const blockedUserIds = blocked.map(v => v.key);
  const blockedUsersInfo = await Promise.all(
    blockedUserIds.map(async (id) => {
      const blockedUser = await User.findByUniqueId(id);
      return blockedUser?.safeData;
    })
  );

  const users: Record<string, IUser> = {};
  for (const blockedUser of blockedUsersInfo) {
    if (blockedUser) {
      users[blockedUser._key] = blockedUser;
    }
  }

  return {
    blocked,
    user: toBlockUser,
    userId: url.searchParams.get('id') ?? '',
    users,
  }
}
