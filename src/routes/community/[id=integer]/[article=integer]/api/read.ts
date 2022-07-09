import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {User} from '$lib/auth/user/server';
import type {ArticleDto} from '$lib/types/dto/article.dto';
import HttpStatus from 'http-status-codes';

export async function get({params, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const read = new ReadArticleRequest(params.id, params.article);

  try {
    const uid = locals?.user?.uid;
    const article: any = await read.get(uid);
    return {
      status: 200,
      body: {
        article,
      }
    }
  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: 'article invalid:' + e.toString(),
      }
    }
  }
}

class ReadArticleRequest {
  constructor(private readonly board: string,
              private readonly article: string) {
  }

  async get(reader?: string) {
    const cursor = await db.query(aql`
      for article in articles
        filter article._key == ${this.article} and article.board == ${this.board}
          return article`);

    const article: ArticleDto = await cursor.next();

    console.log(article);
    article.views += 1;


    const tags: Record<string, number> = {};

    for (const userTags of Object.values(article.tags)) {
      for (const tag of Object.values(userTags) as any[]) {
        const tagName = tag.name;
        tags[tagName] = Object.hasOwn(tags, tagName) ? tags[tagName] + 1 : 1;
      }
    }

    const uid = article.author;
    if (!uid) {
      return null;
    }

    const user = await User.getByUniqueId(uid);

    if (!user) {
      return null;
    }

    // todo

    const myTags = reader ? article.tags[reader] : undefined;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete article.tags;

    article.tags = tags;

    return {
      ...article,
      user: {name: user.id},
      myTags,
    }

  }
}