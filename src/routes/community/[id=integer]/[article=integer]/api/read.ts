import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {User} from '$lib/auth/user/server';
import type {ArticleDto} from '$lib/types/dto/article.dto';
import HttpStatus from 'http-status-codes';

export async function get({params, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const read = new ReadArticleRequest(params.id, params.article);
  console.log(read);

  try {
    return {
      status: 200,
      body: {
        article: await read.get(locals?.user?.uid),
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

  /*
  private updateArticle() {
    console.log('update article:', this.article)
    return db.query(aql`
      for article in articles
        let v = article.views != null ? article.views + 1 : 1
        update { _key: ${this.article} } with { views: v } in articles`);
  } // */

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

    const myTags = reader ? (<Record<string, Record<string, any>>>article.tags)[reader] : undefined;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete article.tags;

    (<any>article).tags = tags;

    return {
      ...article,
      user: {name: user.id},
      myTags,
    }

  }
}