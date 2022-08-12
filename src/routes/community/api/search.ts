import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {isEmpty, last} from 'lodash-es';
import type {ArticleItemDto} from '$lib/types/dto/article-item.dto';
import {client} from '$lib/database/search';

export async function GET({params, url}: RequestEvent): Promise<RequestHandlerOutput> {
  const q = url.searchParams.get('q') ?? '';
  console.log('q:', q);
  if (isEmpty(q)) {
    return {
      status: HttpStatus.NO_CONTENT,
    };
  }

  const {id} = params;
  try {

    const search = new ArticleSearch(id, q);

    return {
      status: HttpStatus.OK,
      body: {
        result: await search.result(),
      } as any,
    };
  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString(),
      } as any,
    };
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
      })

    return d as any;


    /*
    const cursor = await db.query(aql`
      for article in articles
        let savedTags = (
          for tag in tags
            filter tag.target == article._key && tag.pub
              return tag)
        let tagNames = (for tag in savedTags collect names = tag.name return names)
        let cTags = ${this.tags}
        let exTags = ${this.exclTags}
        let bCheckTags = length(cTags) > 0
        let bCheckExTags = length(exTags) > 0
        let bSkip = !bCheckTags && !bCheckExTags
        filter bSkip || (cTags any in tagNames && exTags none in tagNames)
        let titleExCheck = (
          for t in ${this.exclTitles}
            filter find_first(article.title, t) > 0
              return t)
        filter length(titleExCheck) <= 0
        let titleIncCheck = (
          for t in ${this.titles}
            filter find_first(article.title, t) > 0
              return t)
        filter length(titleIncCheck) >= 0
        let contentCheck = (
          for c in ${this.plains}
            filter find_first(article.content, c) > 0
              return c)
        filter length(contentCheck) > 0
          return article`);
    return await cursor.all(); // */

    /*
    let keys: string[] = [];
    if (!isEmpty(this.tags)) {
      const cursor = await db.query(aql`
        for article in articles
          let savedTags = (
            for tag in tags
             filter tag.target == article._key && tag.pub
             return tag)
          let tagNames = (for tag in savedTags collect names = tag.name return names)
          filter ${this.tags} any in tagNames && ${this.exclTags} none in tagNames
          return article._key`)
      keys = await cursor.all();
    }
    if (!isEmpty(this.titles) || !isEmpty(this.exclTitles)) {
      const q = [
        this.titles.join(','),
        this.exclTitles.map(t => `-${t}`).join(','),
      ].join(',');
      console.log(q)
      const cursor = await db.query(aql`
      for article in fulltext(articles, "title", ${q})
        filter ${isEmpty(keys)} || article._key in ${keys}
        return article._key`);
      keys = await cursor.all();
    }

    if (!isEmpty(this.plains)) {
      const q = this.plains.join(',');
      const cursor = await db.query(aql`
        for article in fulltext(articles, "content", ${q})
          filter ${isEmpty(keys)} || article._key in ${keys}
          return article._key`);
      keys = await cursor.all();
    }


    return [];
 // isEmpty(keys) ? result.hits : result.hits.filter(hit => keys.includes(hit.document.id));

    // */
  }

}