import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {User} from '$lib/auth/user/server';
import type {ArticleDto, ClientToServerTagType} from '$lib/types/dto/article.dto';
import HttpStatus from 'http-status-codes';
import {isEmpty} from 'lodash-es';
import {Article} from '$lib/community/article/server';
import {EUserRanks} from '$lib/types/user-ranks';
import {load} from 'cheerio';
import type {Element} from 'cheerio/lib';
import * as process from 'process';
import {extname} from 'node:path';
import {AddViewCountRequest} from '../viewcount/+server';
import {error} from '$lib/kit';
import type {PageData} from '@routes/community/[id=integer]/[article=integer]/$types';

export async function GET({params, locals}: RequestEvent): Promise<Response> {
  const {id, article: articleId} = params;

  if (!id || !articleId) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const read = new ReadArticleRequest(id, articleId);

  const uid: string | undefined = locals?.user?.uid;
  const force = uid ? locals.user!.rank > EUserRanks.User : false;
  const article = await read.get(uid, force);
  console.log('_article:', article);

  if (!article) {
    throw error(HttpStatus.NOT_FOUND);
  }

  if (article && Object.keys(article.tags ?? {}).includes('성인')) {
    if (locals?.user?.adult !== true) {
      throw error(HttpStatus.SERVICE_UNAVAILABLE, 'you are not adult account');
    }
  }

  if (article?.serials) {
    const serialIds: string[] = article.serials;
    article.serials = await read.getSerialTitles(serialIds);
  }

  const reader = await User.findByUniqueId(locals?.user?.uid);
  if (reader) {
    await reader.readAllNotifications(articleId);
  }

  const view = new AddViewCountRequest(articleId);

  await view.read(locals?.user ? locals.user.uid : locals.sessionId!);

  const articleInstance = new Article(articleId);

  article.views = await articleInstance.getViewCount();

  return json({
    ...article,
  });
}

class ReadArticleRequest {
  constructor(private readonly board: string,
              private readonly article: string) {
  }

  private async toConvertedImages(content: string): Promise<string> {
    const $ = load(content ?? '');
    const imgs = $('img');
    // @ts-ignore
    const exes = imgs.toArray().map(async (img: Element) => {
      const src = img.attribs?.src;
      if (src && src.startsWith(`https://${process.env.S3_ENDPOINT}`)) {
        const ext = extname(src);
        const keyParser = new RegExp(`https://${process.env.S3_ENDPOINT}/(.+)(?:${ext})`);
        const keyParsed = keyParser.exec(src);
        if (keyParsed) {
          const key = `/${keyParsed[1]}`;
          const cursor = await db.query(aql`
          for image in images
            filter image.src == ${key}
              return image.converted`);
          if (cursor.hasNext) {
            const converted: string[] = await cursor.next();
            const sources = converted
              .map((link) => {
                const mime = extname(link).replace(/^\./, 'image/');
                return `<source srcset="${link}" type="${mime}"/>`;
              })
              .join('');
            let attribs = '';
            if (img?.attribs) {
              attribs = Object.keys(img!.attribs)
                .map((key) => {
                  return `${key}="${img!.attribs[key]}"`;
                })
                .join(' ');
            }
            $(img).replaceWith(`<picture>${sources}<img ${attribs} alt="유즈는 귀엽다." /></picture>`);
          }
        }
      }
    });
    await Promise.allSettled(exes);
    return $('body').html() ?? '';
  }

  async get(reader?: string, force = false): Promise<Partial<PageData> | null> {
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

    // console.log('original:', article.content);
    article.content = await this.toConvertedImages(article.content ?? '');

    // @ts-ignore
    const result: Partial<IArticleGetResult> = {
      ...article,
      // user: {name: user.id},
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
