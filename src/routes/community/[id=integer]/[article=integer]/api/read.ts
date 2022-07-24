import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {User} from '$lib/auth/user/server';
import type {ArticleDto} from '$lib/types/dto/article.dto';
import HttpStatus from 'http-status-codes';
import type {ClientToServerTagType} from '$lib/types/dto/article.dto';
import {isEmpty} from 'lodash-es';
import {Article} from '$lib/community/article/server';

export async function GET({params, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const read = new ReadArticleRequest(params.id, params.article);

  try {
    const uid = locals?.user?.uid;
    const article = await read.get(uid);

    if (article?.serials) {
      const serialIds: string[] = article.serials;
      article.serials = await read.getSerialTitles(serialIds);
    }

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
          let tagNames = (
            for t in savedTags
              return t.name)
          let mt = (
            for t in savedTags
              filter t.user == ${reader ?? ''}
                return t.name)
          
          return merge(article, {tags: tagNames, myTags: mt})`);

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

    const result: Record<string, any> = {
      ...article,
      user: {name: user.id},
      tags,
    };

    const serials = Object.keys(tags)
      .filter(tag => tag.startsWith('연재:'))
      .map(tag => tag.replace(/^연재:/gm, ''));
    if (!isEmpty(serials)) {
      const a = new Article(this.article);
      result.serials = await a.getSerialArticleIds();
    }

    return result;
  }

  async getSerialTitles(articleIds: string[]) {
    const cursor = await db.query(aql`
      for article in articles
        sort article.createdAt desc
        filter article._key in ${articleIds} && article.board == ${this.board}
          return keep(article, "title", "_key", "createdAt")`);
    return await cursor.all();
  }
}