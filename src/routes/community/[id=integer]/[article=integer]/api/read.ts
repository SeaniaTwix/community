import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {User} from '$lib/auth/user/server';

export async function get({params, url}: RequestEvent): Promise<RequestHandlerOutput> {
  const read = new ReadArticleRequest(params.id, params.article);

  return {
    status: 200,
    body: {
      article: await read.get(),
    }
  }
}

class ReadArticleRequest {
  constructor(private readonly board: string,
              private readonly article: string) {
  }

  private addViewCount() {
    return db.query(aql`
      for article in articles
        update { _key: ${this.article}, views: article.views ? article.view + 1 : 1 } in articles`)
  }

  async get() {
    const cursor = await db.query(aql`
      for article in articles
        filter article._key == ${this.article} and article.board == ${this.board}
          return article`);

    const article = await cursor.next();

    await this.addViewCount();

    const uid = article.author;
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