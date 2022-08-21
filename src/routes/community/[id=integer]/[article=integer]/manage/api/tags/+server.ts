import { json } from '@sveltejs/kit';
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {EUserRanks} from '$lib/types/user-ranks';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {Article} from '$lib/community/article/server';

const noPermissionError: RequestHandlerOutput = {
  status: HttpStatus.NOT_ACCEPTABLE,
};

export async function GET({params, locals: {user}}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!user || user.rank <= EUserRanks.User) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return noPermissionError;
  }

  const manage = new TagManageRequest(params.id, params.article);

  if (!await manage.exists()) {
    return json({
  reason: 'article not exists',
}, {
      status: HttpStatus.BAD_REQUEST
    });
  }

  try {
    return json({
  tags: await manage.getAllTags(),
  author: await manage.getArticleAuthor(),
}, {
      status: HttpStatus.OK
    });
  } catch (e: any) {
    return json({
  reason: e.toString(),
}, {
      status: HttpStatus.BAD_GATEWAY
    });
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
  async getAllTags() {
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