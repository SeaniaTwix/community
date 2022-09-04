import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {EUserRanks} from '$lib/types/user-ranks';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {Article} from '$lib/community/article/server';
import {error} from '$lib/kit';
import type {ITag} from '$lib/types/tag';
import type {IUser} from '$lib/types/user';

const noPermissionError = {
  status: HttpStatus.NOT_ACCEPTABLE,
};

export async function GET({params, locals: {user}}: RequestEvent): Promise<Response> {
  if (!user || user.rank <= EUserRanks.User) {
    throw error(noPermissionError.status);
  }

  const {id, article} = params;

  if (!id || !article) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const manage = new TagManageRequest(id, article);

  if (!await manage.exists()) {
    return json({
      reason: 'article not exists',
    }, {
      status: HttpStatus.BAD_REQUEST,
    });
  }

  try {
    return json({
      tags: await manage.getAllTags(),
      author: await manage.getArticleAuthor(),
    }, {
      status: HttpStatus.OK,
    });
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }
}

class TagManageRequest {
  private readonly article: Article;

  constructor(private readonly board: string,
              article: string) {
    this.article = new Article(article);
  }

  exists() {
    return this.article.exists;
  }

  async getArticleAuthor() {
    const data = await this.article.get();
    return data.author;
  }

  /**
   * 태그를 작성한 사용자 정보와 함께 pub이 false인 태그도 전부 반환합니다.
   */
  async getAllTags(): Promise<(ITag & {user: IUser})[]> {
    const cursor = await db.query(aql`
      for tag in tags
        filter tag.target == ${this.article.id}
          let user = first(
            for user in users
              filter user._key == tag.user
                return keep(user, "_key", "id", "avatar"))
          return merge(unset(tag, "_id", "_rev"), {user: user})`);
    return await cursor.all();
  }
}