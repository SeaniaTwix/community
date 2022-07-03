import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {User} from '$lib/auth/user/server';
import type {ArticleDto} from '$lib/types/dto/article.dto';
import HttpStatus from 'http-status-codes';

export async function get({params}: RequestEvent): Promise<RequestHandlerOutput> {
  const read = new ReadArticleRequest(params.id, params.article);

  try {
    return {
      status: 200,
      body: {
        article: await read.get(),
      }
    }
  } catch (e) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: 'article invalid',
      }
    }
  }
}

class ReadArticleRequest {
  constructor(private readonly board: string,
              private readonly article: string) {
  }

  /*
  private updateArticle() {
    console.log('update article:', this.article)
    return db.query(aql`
      for article in articles
        let v = article.views != null ? article.views + 1 : 1
        update { _key: ${this.article} } with { views: v } in articles`);
  } // */

  async get() {
    const cursor = await db.query(aql`
      for article in articles
        filter article._key == ${this.article} and article.board == ${this.board}
          return article`);

    const article: ArticleDto = await cursor.next();

    // await this.updateArticle();
    article.views += 1;

    const uid = article.author;
    if (!uid) {
      return null;
    }

    const user = await User.getByUniqueId(uid);

    if (!user) {
      return null;
    }

    // todo

    return {
      ...article,
      user: {name: user.id}
    }

  }
}