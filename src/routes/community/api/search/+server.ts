import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {isEmpty, last} from 'lodash-es';
import {client} from '$lib/database/search';
import {json} from '$lib/kit';

export async function retrive(id?: string, query?: string | null) {
  const q = query ?? '';
  //console.log('q:', q);
  if (isEmpty(q)) {
    return undefined;
  }

  // todo: board relative search
  const search = new ArticleSearch(id ?? '', q);
  try {
    return await search.result();
  } catch (e: any) {
    return undefined
  }
}

export async function GET({url, params: {id}}: RequestEvent): Promise<Response> {
  const result = retrive(id, url.searchParams.get('q'));
  if (!result) {
    return new Response(undefined, {status: HttpStatus.NO_CONTENT});
  }
  return json({result});
}

export class ArticleSearch {
  private readonly frags: string[];
  private readonly _tags: string[];
  private readonly tags: string[];
  private readonly _exclTags: string[];
  private readonly exclTags: string[];
  private readonly _titles: string[];
  private readonly titles: string[];
  private readonly _exclTitles: string[];
  private readonly exclTitles: string[];
  // it contains exclude (-) bcz arangodb support fulltext search
  private readonly plains: string[];

  /**
   *
   * @param board 검색할 게시판 id. 비어있으면 전체 검색
   * @param query 검색할 검색어 (fulltext search)
   * @param page 현재 페이지
   * @param max 한 페이지에서 보여줄 최대 요소 수
   */
  constructor(private readonly board: string,
              query: string,
              private readonly page = 1,
              private readonly max = 30) {
    this.frags = query.split(/\s/).map(q => q.trim());
    this._tags = this.frags
      .filter(q => q.startsWith('#') && q.length >= 2);
    this.tags = this._tags.map(tag => tag.substring(1));
    this._exclTags = this.frags
      .filter(q => q.startsWith('-#') && q.length >= 3);
    this.exclTags = this._exclTags.map(tag => tag.substring(2));
    this._titles = this.frags
      .filter(q => q.startsWith('$') && q.length >= 2);
    this.titles = this._titles.map(title => title.substring(1));
    this._exclTitles = this
      .frags.filter(q => q.startsWith('-$') && q.length >= 3);
    this.exclTitles = this._exclTitles.map(title => title.substring(2));
    this.plains = this.frags.filter((q) => {
      return !this._tags.includes(q)
        && !this._exclTags.includes(q)
        && !this._titles.includes(q)
        && !this._exclTitles.includes(q);
    });
    // console.log(this);
  }

  private static transformTagCondition(tagCondition: string) {
    const operator = /([>=<]=?)/gm;
    const ops = operator.exec(tagCondition);
    const op = ops ? ops[1] : '>';
    const tagConSplitted = tagCondition.split(operator);
    const compare = tagConSplitted.length > 1 ? last(tagConSplitted) : '0';
    return `'tags.${tagConSplitted[0]}'${op}${compare}`;
  }

  private static transformTagExcludeCondition(tagCondition: string) {
    // todo: exists filter is not yet ready in meilisearch. (requires ^0.29.0)
    return `tags.${tagCondition} NOT EXISTS`;
  }

  async result(): Promise<ISearchResult> {
    const settings = await client.index('articles')
      .getSettings();

    if (settings.filterableAttributes?.find(attr => attr === 'tags') !== 'tags') {
      await client.index('articles')
        .updateSettings({
          filterableAttributes: ['tags'],
          sortableAttributes: ['id', 'createdAt'],
        });
    }

    const filter = this.tags.map(ArticleSearch.transformTagCondition);
    const exclFilter = this.exclTags.map(ArticleSearch.transformTagExcludeCondition);

    const d = await client.index('articles')
      .search(this.plains.join(' '), {
        filter: [filter, exclFilter],
        sort: ['createdAt:desc'],
        limit: this.max,
      });

    return d as any;
  }

}

interface ISearchResult {
  hits: ISearchArticleResult[];
}

export interface ISearchArticleResult {
  board: string;
  id: string;
  title: string;
  source: string;
  content: string;
  tags: object;
  author: object;
  createdAt: number;
}
