import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {User} from '$lib/auth/user/server';
import type {ArticleDto, ClientToServerTagType} from '$lib/types/dto/article.dto';
import HttpStatus from 'http-status-codes';
import {isEmpty} from 'lodash-es';
import {Article} from '$lib/community/article/server';
import {EUserRanks} from '$lib/types/user-ranks';
import type {IArticle} from '$lib/types/article';

export async function GET({params, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const read = new ReadArticleRequest(params.id, params.article);

  try {
    const uid = locals?.user?.uid;
    const force = uid ? locals.user.rank > EUserRanks.User : false;
    const article = await read.get(uid, force);

    if (!article) {
      return {
        status: HttpStatus.NOT_FOUND,
      }
    }

    if (article && Object.keys(article.tags ?? {}).includes('성인')) {
      if (locals?.user?.adult !== true) {
        return {
          status: HttpStatus.NOT_ACCEPTABLE,
          body: {
            reason: 'you are not adult account',
          },
        };
      }
    }

    if (article?.serials) {
      const serialIds: string[] = article.serials;
      article.serials = await read.getSerialTitles(serialIds);
    }

    const reader = await User.findByUniqueId(locals?.user?.uid);
    if (reader) {
      await reader.readAllNotifications(params.article);
    }

    return {
      status: 200,
      body: {
        article,
      } as any,
    };
  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: 'article invalid:' + e.toString(),
      },
    };
  }
}

class ReadArticleRequest {
  constructor(private readonly board: string,
              private readonly article: string) {
  }

  async get(reader?: string, force = false): Promise<Partial<IArticleGetResult> | null> {
    const cursor = await db.query(aql`
      for article in articles
        let isPub = ${force} || (is_bool(article.pub) ? article.pub : true)
        filter article._key == ${this.article} and article.board == ${this.board} && isPub
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
          let author = first(
            for user in users
              filter user._key == article.author
                return user)
          return merge(article, {tags: tagNames, myTags: mt, author: keep(author, "_key", "id", "avatar")})`);

    const article: ArticleDto<ClientToServerTagType> = await cursor.next();

    if (!article) {
      return null;
    }

    // it won't be affect to real data
    article.views += 1;

    const uid = article?.author?._key;
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

    // @ts-ignore
    const result: Partial<IArticleGetResult> = {
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

// @ts-ignore
interface IArticleGetResult extends Partial<IArticle<Record<string, number>>> {
  user: { name: string };
  tags: Record<string, number>;
  serials?: string[];
}