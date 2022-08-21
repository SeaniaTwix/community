import { json } from '@sveltejs/kit';
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {Article} from '$lib/community/article/server';
import {isEmpty, uniq} from 'lodash-es';
import {Pusher} from '$lib/pusher/server';

export async function DELETE({params, url, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return json({
  reason: 'please login and try again',
}, {
      status: HttpStatus.UNAUTHORIZED
    });
  }

  const {id, article} = params;

  const names = url.searchParams.get('name');

  if (!names || isEmpty(names)) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return invalidTagNameError;
  }

  const tagList = uniq(names.split(',').map(t => t.trim()));

  const remover = new RemoveTagRequest(article, tagList);

  try {
    await remover.removeAll(locals.user.uid);
  } catch (e: any) {
    return json({
  reason: e.toString()
}, {
      status: HttpStatus.BAD_GATEWAY
    })
  }

  const uniqTagList: string[] = uniq(tagList);

  await Pusher.notify('tag', `${article}@${id}`, '0', {
    tag: uniqTagList,
    type: 'remove',
  });

  return new Response(undefined, { status: HttpStatus.ACCEPTED });
}

const invalidTagNameError: RequestHandlerOutput = {
  status: HttpStatus.NOT_ACCEPTABLE,
  body: {
    reason: 'tag name is require and must be longer than 1 character.',
  },
};

class RemoveTagRequest {
  private article: Article;

  constructor(articleId: string, private readonly tags: string[]) {
    this.article = new Article(articleId);
  }

  async removeAll(userId: string) {
    if (!await this.article.exists) {
      return;
    }
    return await this.article.removeTags(userId, this.tags);
  }
}