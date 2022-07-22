import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {User} from '$lib/auth/user/server';
import type {ArticleDto} from '$lib/types/dto/article.dto';
import HttpStatus from 'http-status-codes';
import type {ClientToServerTagType} from '$lib/types/dto/article.dto';

export async function GET({params, locals}: RequestEvent): Promise<RequestHandlerOutput> {
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
        filter article._key == ${this.article} and article.board == ${this.board} && (is_bool(article.pub) ? article.pub : true)
          let savedTags = (
            for tag in tags
              filter tag.target == article._key && tag.pub
                return tag)
          let ts = (
            for t in savedTags
              collect names = t.name
              return names)
          let mt = (
            for t in savedTags
              filter t.user == ${reader ?? ''}
                collect names = t.name
                return names)
          
          return merge(article, {tags: ts, myTags: mt})`);

    const article: ArticleDto<ClientToServerTagType> = await cursor.next();

    if (!article) {
      return null;
    }

    // it won't be affect to real data
    article.views += 1;

    const uid = article.author;
    if (!uid) {
      return null;
    }

    const user = await User.getByUniqueId(uid);

    if (!user) {
      return null;
    }

    const tags: Record<string, number> = {};

    for (const tag of article.tags ?? []) {
      if (tags[tag]) {
        tags[tag] += 1;
      } else {
        tags[tag] = 1;
      }
    }

    return {
      ...article,
      user: {name: user.id},
      tags,
    }

  }
}