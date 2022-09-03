import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {isEmpty, last} from 'lodash-es';
import type {ArticleItemDto} from '$lib/types/dto/article-item.dto';
import {client} from '$lib/database/search';
import {error, json} from '$lib/kit';

export async function GET({params, url}: RequestEvent): Promise<Response> {
  const q = url.searchParams.get('q') ?? '';
  //console.log('q:', q);
  if (isEmpty(q)) {
    return new Response(undefined, { status: HttpStatus.NO_CONTENT });
  }

  const {id} = params;
  if (!id) {
    throw error(HttpStatus.BAD_GATEWAY);
  }
  const search = new ArticleSearch(id, q);
  try {
    return json({
      result: await search.result(),
    });
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }
}

class ArticleSearch {
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
      .filter(q => q.startsWith('@') && q.length >= 2);
    this.titles = this._titles.map(title => title.substring(1));
    this._exclTitles = this
      .frags.filter(q => q.startsWith('-@') && q.length >= 3);
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
    return `tags.${tagConSplitted[0]}${op}${compare}`;
  }

  private static transformTagExcludeCondition(tagCondition: string) {
    // todo: exists filter is not yet ready in meilisearch.
  }

  async result(): Promise<ArticleItemDto[]> {
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

    const d = await client.index('articles')
      .search(this.plains.join(' '), {
        filter,
        limit: this.max,
      });

    return d as any;
  }

}