import { json } from '@sveltejs/kit';
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import {Article} from '$lib/community/article/server';
import {striptags} from 'striptags';

export async function GET({locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return new Response(undefined, { status: HttpStatus.UNAUTHORIZED });
  }

  const user = await User.findByUniqueId(locals?.user?.uid);

  const list = await user?.loadAllNotifications(1, 20);

  if (!list) {
    return json({
  reason: `${locals?.user?.uid} is not a user`,
}, {
      status: HttpStatus.BAD_GATEWAY
    });
  }

  throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
  // Suggestion (check for correctness before using):
  // return new Response({
  // list: await Promise.all(
  //   list
  //     .filter(notify => notify.root.split('/').length >= 2)
  //     .map(async (notify) => {
  //       const article = new Article(notify.root.split('/')[1]);
  //       const articleData = await article.get();
  //       const title = striptags(articleData.title ?? '');
  //       notify.content = title.slice(0, 20);
  //       if (title.length > 20) {
  //         notify.content += '...';
  //       }
  //       notify.unread = !!notify.unread;
  //       return notify;
  //     }),
  // ),
} as any);
  return {
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
  };
}