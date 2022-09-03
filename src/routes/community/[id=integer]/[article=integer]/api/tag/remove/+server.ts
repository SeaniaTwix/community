import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {Article} from '$lib/community/article/server';
import {isEmpty, uniq} from 'lodash-es';
import {Pusher} from '$lib/pusher/server';
import {error} from '$lib/kit';
import type {TagError} from '@routes/community/[id=integer]/[article=integer]/api/tag/add/+server';

// noinspection JSUnusedGlobalSymbols
export async function DELETE({params, url, locals}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    throw error(HttpStatus.UNAUTHORIZED, 'please login and try again');
  }

  const {id, article} = params;

  if (!id || !article) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const names = url.searchParams.get('name');

  if (!names || isEmpty(names)) {
    throw error(invalidTagNameError.status, invalidTagNameError.reason);
  }

  const tagList = uniq(names.split(',').map(t => t.trim()));

  const remover = new RemoveTagRequest(article, tagList);

  try {
    await remover.removeAll(locals.user.uid);
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }

  const uniqTagList: string[] = uniq(tagList);

  await Pusher.notify('tag', `${article}@${id}`, '0', {
    tag: uniqTagList,
    type: 'remove',
  });

  return new Response(undefined, {status: HttpStatus.ACCEPTED});
}

const invalidTagNameError: TagError = {
  status: HttpStatus.NOT_ACCEPTABLE,
  reason: 'tag name is require and must be longer than 1 character.',
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