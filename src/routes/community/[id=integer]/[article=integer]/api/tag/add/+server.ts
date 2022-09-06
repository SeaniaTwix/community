import {json} from '@sveltejs/kit';
// noinspection NonAsciiCharacters

import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {isEmpty, uniq} from 'lodash-es';
import {Article} from '$lib/community/article/server';
import {Pusher} from '$lib/pusher/server';
import {User} from '$lib/auth/user/server';
import {EUserRanks} from '$lib/types/user-ranks';
import type {IUserSession} from '@root/app';
import {error} from '$lib/kit';

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

/**
 *
 * @param id 게시판 id
 * @param article 게시글 id, 새 글 쓰기 중일 땐 null
 * @param user user session
 * @param tagList 태그 이름 배열
 * @return 에러가 있다면 TagError를, 없다면 undefined를 반환합니다.
 */
export async function getTagErrors(id: string, article: string | null, user: IUserSession, tagList: string[]): Promise<TagError | undefined> {
  const validatorDefault = '[a-zA-Zㄱ-ㅎ가-힣@:-]+$';
  const validatorSub = '[a-zA-Zㄱ-ㅎ가-힣@-]+$';

  for (const name of tagList) {
    const tagNameValidator = new RegExp(`^(${validatorDefault})`, 'g');
    const serialValidator = new RegExp(`^연재:(${validatorSub})`);
    const preventValidator = new RegExp(`^방지:(${validatorSub})`);
    /**
     * 여기 예약 태그들은 한 번에 등록할 수 없습니다.
     * 추천과 비추천을 한 번에 누르지 못하게 하기 위함입니다.
     * 따라서 예약 태그를 발견하면 해당 예약 태그만 등록하고 나머지 요청은 무시됩니다.
     */
    if (name.startsWith('_') || Object.keys(reserved).includes(name)) {
      if (Object.values(reserved).includes(name.slice(1))) {
        const addTag = article ? new AddTagRequest(article, [name]) : null;

        if (!addTag || await addTag.isMyArticle(user.uid)) {
          return {
            status: HttpStatus.NOT_ACCEPTABLE,
            reason: 'cannot be tagged by yourself that',
          };
        }

        if (name === '_like' || name === '_dislike') {
          if (!addTag || await addTag.isVoteAlready(user.uid)) {
            return {
              status: HttpStatus.NOT_ACCEPTABLE,
              reason: 'you voted this already',
            };
          }
        }

        try {
          if (addTag) {
            await addTag.addAll(user.uid);
          }
        } catch (e: any) {
          return {
            status: HttpStatus.BAD_GATEWAY,
            reason: e.toString(),
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

    if (name === '공지' && (!user || user.rank <= EUserRanks.User)) {
      return unacceptableTagNameError(name, 'you have no permission');
    }
    if (!tagNameValidator.test(name)) {
      // console.log('test default:', name);
      return unacceptableTagNameError(name);
    }

    const serialTagCheck = serialValidator.exec(name);
    if (name.startsWith('연재:')) {
      // console.log('test serials:', name);
      if (!serialTagCheck || !tagNameValidator.test(serialTagCheck[1])) {
        return unacceptableTagNameError(name, `${name} is not validate series name`);
      }
      // return unacceptableSerialNameError;
    }

    const preventCheck = preventValidator.exec(name);
    /** todo
     * 방지 태그는 다음과 같은 기능을 지원합니다.
     * 방지:베스트 - 베스트에 포함되지 않도록 강제합니다.
     * 방지:미리보기 - 메타 임베딩 및 갤러리 모드에서 미리보기를 방지합니다.
     * 방지:미인증-보기 - 본인인증된 사용자만 보기 가능
     * 방지:미인증-댓글 - 본인인증된 사용자만 댓글 가능 (보기는 모두 허용)
     */
    if (name.startsWith('방지:')) {
      if (!preventCheck || !tagNameValidator.test(preventCheck[1])) {
        return unacceptableTagNameError(name);
      }
    }
  }
}

export async function PUT({params, url, locals}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    throw error(HttpStatus.UNAUTHORIZED, 'please login and try again');
  }

  const names = url.searchParams.get('name');

  if (!names || isEmpty(names)) {
    throw error(invalidTagNameError.status, invalidTagNameError.reason);
  }

  // 연재물 태그는 최소 한 글자 이상이어야 합니다.
  const {id, article} = params;

  if (!id || !article) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const tagList = uniq(names.split(',').map(t => t.trim()));

  const tagError = await getTagErrors(id, article, locals.user, tagList);

  if (tagError) {
    throw error(tagError.status, tagError.reason);
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
    return json({
      reason: e.toString(),
    }, {
      status: HttpStatus.BAD_GATEWAY,
    });
  }

  try {
    Pusher.notify('tag', `${article}@${id}`, '0', {
      tag: uniqTagList,
      type: 'add',
    }).then();
  } catch (e) {
    //
  }


  return new Response(undefined, {status: HttpStatus.ACCEPTED});
}

class AddTagRequest {
  private article: Article;

  constructor(articleId: string, private tags: string[]) {
    this.article = new Article(articleId);
  }

  async addAll(userId: string) {
    if (!await this.article.exists) {
      throw new Error('article is not exists');
    }
    const user = await User.findByUniqueId(userId);
    if (!user || !await user.isAdult()) {
      this.tags = this.tags.filter(tag => tag !== '성인');
    }
    const isSelf = await this.isMyArticle(userId);
    const tags: string[] = Object.keys(await this.article.getAllTagsCounted());
    if (isSelf) {
      if (!isEmpty(this.tags.filter(tag => tag.startsWith('_')))) {
        throw new Error('you can\'t vote yourself.');
      }
      if (tags.length >= 30) {
        throw new Error('tag limit (author: 30)');
      }
    } else {
      if (tags.length >= 20) {
        throw new Error('tag limit (not author: 20)');
      }
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


const invalidTagNameError: TagError = {
  status: HttpStatus.NOT_ACCEPTABLE,
  reason: 'tag name is require and must be longer than 1 character.',
};

const succeed = undefined;

const unacceptableTagNameError: (tag: string, reason?: string) => TagError = (tag, reason) => {
  console.trace(tag, reason);
  return {
    status: HttpStatus.NOT_ACCEPTABLE,
    reason: reason ? reason : `'${tag}' is unacceptable`,
  };
};

const unacceptableSerialNameError: TagError = {
  status: HttpStatus.NOT_ACCEPTABLE,
  reason: 'serial tag identifier cannot be empty',
};

export interface TagError {
  status: number;
  reason: string;
}