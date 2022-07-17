import {MeiliSearch} from 'meilisearch';
import {striptags} from 'striptags';
import instance from './instance';
import {aql} from 'arangojs';
import type {IArticle} from '$lib/types/article';
import {User} from '$lib/auth/user/server';
import { uniq } from 'lodash-es';
import {Article} from '../community/article/server';

export const client = new MeiliSearch({
  host: 'http://127.0.0.1:7700',
  apiKey: process.env.SEARCH_KEY,
});

export async function storeAllArticles() {
  const cursor = await instance.query(aql`
    for article in articles
      filter article.pub
        return article`);
  const articles: IArticle[] = await cursor.all();

  const authors = await Promise.all(
    uniq(articles
      .map(articles => articles.author))
      .map(author => User.getByUniqueId(author!))
  );

  const docs = articles.map(async (article) => {
    const obj = new Article(article._key);
    const author = authors.find(author => author?._key === article.author);
    return {
      board: article.board,
      id: article._key,
      title: article.title,
      source: article.source,
      author: {
        uid: article.author,
        name: author?.id ?? '알 수 없음',
      },
      content: striptags(article.content ?? '')
        .replace(/&nbsp;/, ''),
      tags: await obj.getAllTagsCounted(),
      createdAt: (new Date(article.createdAt!)).getTime(),
    }
  })

  await client.index('articles').updateDocuments(await Promise.all(docs));
}