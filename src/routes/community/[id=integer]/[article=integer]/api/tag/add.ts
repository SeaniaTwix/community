// noinspection NonAsciiCharacters

import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {isEmpty, uniq} from 'lodash-es';
import {Article} from '$lib/community/article/server';
import {Pusher} from '$lib/pusher/server';

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
  '일베충': 'smile',
  '어그로': '03',
};

export async function PUT({params, url, locals}: RequestEvent): Promise<RequestHandlerOutput> {
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
  const tagNameValidator = /^[a-zA-Zㄱ-ㅎ가-힣-@:]+$/g;
  // 연재물 태그는 최소 한 글자 이상이어야 합니다.
  const serialValidator = /^연재:.+$/g;
  const {id, article} = params;

  for (const name of tagList) {
    /**
     * 여기 예약 태그들은 한 번에 등록할 수 없습니다.
     * 추천과 비추천을 한 번에 누르지 못하게 하기 위함입니다.
     * 따라서 예약 태그를 발견하면 해당 예약 태그만 등록하고 나머지 요청은 무시됩니다.
     */
    if (name.startsWith('_') || Object.keys(reserved).includes(name)) {
      if (Object.values(reserved).includes(name.slice(1))) {
        const addTag = new AddTagRequest(article, [name]);

        if (await addTag.isMyArticle(locals.user.uid)) {
          return {
            status: HttpStatus.NOT_ACCEPTABLE,
            body: {
              reason: 'cannot be tagged by yourself that',
            },
          };
        }

        if (name === '_like' || name === '_dislike') {
          if (await addTag.isVoteAlready(locals.user.uid)) {
            return {
              status: HttpStatus.NOT_ACCEPTABLE,
              body: {
                reason: 'you voted this already',
              },
            };
          }
        }

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

        try {
          await Pusher.notify('tag', `${article}@${id}`, '0' /*locals.user.uid*/, {
            tag: [name],
            type: 'add',
          });
        } catch {
          //
        }

        return succeed;
      }

      return unacceptableTagNameError(name);
    }

    // console.log(`${name}:`, tagNameValidator.test(name), tagNameValidator.exec(name));

    if (!tagNameValidator.test(name)) {
      return unacceptableTagNameError(name);
    }

    if (name.startsWith('연재:') && )
  }

  // transform to reserved tag name
  for (const i in tagList) {
    const n = Object.keys(reserved).indexOf(tagList[i]);
    if (n > 0) {
      tagList[i] = Object.values(reserved)[n];
    }
  }

  const uniqTagList: string[] = uniq(tagList);

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

  try {
    Pusher.notify('tag', `${article}@${id}`, locals.user.uid, {
      tag: uniqTagList,
      type: 'add',
    }).then();
  } catch (e) {
    //
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

  async addAll(userId: string) {
    if (!await this.article.exists) {
      return;
    }
    return await this.article.addTags(userId, uniq(this.tags));
  }

  async isVoteAlready(userId: string) {
    try {
      const tags = await this.article.getAllMyTags(userId);
      return tags.find(tag => tag.name === '_like' || tag.name === '_dislike');
    } catch {
      return false;
    }
  }

  async isMyArticle(userId: string) {
    const article = await this.article.get();
    return article.author === userId;
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