import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs/aql';
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

  async get() {
    const cursor = await db.query(aql`
      for article in articles
        filter article._key == ${this.article} and article.board == ${this.board}
          return article`);

    const article = await cursor.next();

    console.log(article);

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