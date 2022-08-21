import { json } from '@sveltejs/kit';
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {isStringInteger} from '$lib/util';
import type {IUser} from '$lib/types/user';
import {isEmpty, uniq} from 'lodash-es';

export async function GET({url}: RequestEvent): Promise<RequestHandlerOutput> {
  const id = url.searchParams.get('id');
  if (!id) {
    const ids = url.searchParams.get('ids');
    if (ids) {
      const list = uniq(ids.split(','));
      if (isEmpty(list)) {
        return json({
  users: [],
}, {
          status: HttpStatus.OK
        })
      }
      const u = list.map(i => {
        if (!isStringInteger(i)) {
          return null;
        }
        return User.findByUniqueId(i)
      });
      const users = await Promise.all(u.filter(a => a));
      const promiseUsers = users
        .filter(user => user)
        .map(user => user!.safeData);
      const resultsSettled = await Promise.allSettled(promiseUsers);
      const results: PromiseSettledResult<IUser>[] = resultsSettled
        .filter(v => v.status === 'fulfilled')
        .map((v: any) => v.value)

      return json({
  users: results as any[],
}, {
        status: HttpStatus.OK
      })
    }

    return json({
  users: [],
}, {
      status: HttpStatus.OK
    })
  }

  const user = await User.findByUniqueId(id);
  if (!user || !await user.exists) {
    return json({
  reason: 'id invalid'
}, {
      status: HttpStatus.BAD_GATEWAY
    })
  }

  const userData = await user.safeData;

  return json({
  user: userData as any,
})
}
