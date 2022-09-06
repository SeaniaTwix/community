import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {isStringInteger} from '$lib/util';
import type {IUser} from '$lib/types/user';
import {isEmpty, uniq} from 'lodash-es';
import {error} from '$lib/kit';

export async function GET({url}: RequestEvent): Promise<Response> {
  const userId = url.searchParams.get('id');
  if (!userId) {
    const userIds = url.searchParams.get('ids');
    if (userIds) {
      const list = uniq(userIds.split(','));
      if (isEmpty(list)) {
        return json({
          users: [],
        }, {
          status: HttpStatus.OK,
        });
      }
      const u = list.map(i => {
        if (!isStringInteger(i)) {
          return null;
        }
        return User.findByUniqueId(i);
      });
      const users = await Promise.all(u.filter(a => a));
      const promiseUsers = users
        .filter(user => user)
        .map(user => user!.safeData);
      const resultsSettled = await Promise.allSettled(promiseUsers);
      const results: PromiseSettledResult<IUser>[] = resultsSettled
        .filter(v => v.status === 'fulfilled')
        .map((v: any) => v.value);

      return json({
        users: results as any[],
      }, {
        status: HttpStatus.OK,
      });
    }

    return json({
      users: [],
    }, {
      status: HttpStatus.OK,
    });
  }

  const user = await User.findByUniqueId(userId);
  if (!user || !await user.exists) {
    throw error(HttpStatus.NOT_FOUND, 'user not found');
  }

  const userData = await user.safeData;

  return json({
    user: userData as any,
  });
}
