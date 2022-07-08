import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {isEmpty, uniq} from 'lodash-es';
import {Article} from '$lib/community/article/server';

/**
 * 예약된 태그들입니다.
 * 추천: _like
 * 비추천: _dislike
 * 벌레: _smile
 * 어그로: _03
 */
const reserved = {
  '추천': 'like',
  '비추': 'dislike',
  '벌레': 'smile',
  '어그로': '03',
};

export async function put({params, url, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return {
      status: HttpStatus.UNAUTHORIZED,
      body: {
        reason: 'please login and try again',
      },
    };
  }

  const names = url.searchParams.get('name');

  if (!names || isEmpty(names)) {
    return invalidTagNameError;
  }

  const tagList = uniq(names.split(',').map(t => t.trim()));
  const tagNameValidator = /^[a-zA-Zㄱ-ㅎ가-힣-@]+$/g;

  for (const name of tagList) {
    if (name.startsWith('_')) {
      if (Object.values(reserved).includes(name.slice(1))) {
        // todo: add reserved tag
        return succeed;
      }

      return unacceptableTagNameError(name);
    }

    console.log(`${name}:`, tagNameValidator.test(name), tagNameValidator.exec(name));

    if (!tagNameValidator.test(name)) {
      return unacceptableTagNameError(name);
    }
  }

  // transform to reserved tag name
  for (const i in tagList) {
    const n = Object.keys(reserved).indexOf(tagList[i]);
    if (n > 0) {
      tagList[i] = Object.values(reserved)[n];
    }
  }

  const uniqTagList = uniq(tagList);
  const {article} = params;

  const addTag = new AddTagRequest(article, uniqTagList);

  try {
    await addTag.addAll(locals.user.uid);
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

class AddTagRequest {
  private article: Article;

  constructor(articleId: string, private readonly tags: string[]) {
    this.article = new Article(articleId);
  }

  addAll(userId: string) {
    return this.article.addTags(userId, uniq(this.tags));
  }


}


const invalidTagNameError: RequestHandlerOutput = {
  status: HttpStatus.NOT_ACCEPTABLE,
  body: {
    reason: 'tag name is require and must be longer than 1 character.',
  },
};

const succeed: RequestHandlerOutput = {
  status: HttpStatus.ACCEPTED,
};

const unacceptableTagNameError: (tag: string) => RequestHandlerOutput = (tag) => ({
  status: HttpStatus.NOT_ACCEPTABLE,
  body: {
    reason: `'${tag}' is unacceptable`,
  },
});