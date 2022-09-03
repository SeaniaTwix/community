import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {Article} from '$lib/community/article/server';
import {striptags} from 'striptags';
import {error} from '$lib/kit';

export async function GET({locals}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    throw error(HttpStatus.UNAUTHORIZED);
  }

  const user = await User.findByUniqueId(locals?.user?.uid);

  if (!user) {
    throw error(HttpStatus.BAD_REQUEST, `${locals?.user?.uid} is not a user`);
  }

  const list = await user.loadAllNotifications(1, 20);

  return json({
    body: {
      list: await Promise.all(
        list
          .filter(notify => notify.root.split('/').length >= 2)
          .map(async (notify) => {
            const article = new Article(notify.root.split('/')[1]);
            const articleData = await article.get();
            const title = striptags(articleData.title ?? '');
            notify.content = title.slice(0, 20);
            if (title.length > 20) {
              notify.content += '...';
            }
            notify.unread = !!notify.unread;
            return notify;
          }),
      ),
    } as any,
  });
}