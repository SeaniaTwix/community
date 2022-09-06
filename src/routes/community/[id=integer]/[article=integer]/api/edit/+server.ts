import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {Article} from '$lib/community/article/server';
import {EditDto} from '$lib/types/dto/edit.dto';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {load as loadHtml} from 'cheerio';
import {client} from '$lib/database/search';
import {striptags} from 'striptags';
import {isEmpty} from 'lodash-es';
import {getTagErrors} from '../tag/add/+server';
import {create} from 'node:domain';
import {error} from '$lib/kit';
import type {ITag} from '$lib/types/tag';

/**
 * 편집 전용 게시글 내용 소스 가져오기
 */
export async function GET({params, locals}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    throw error(HttpStatus.UNAUTHORIZED);
  }

  const {id, article} = params;

  if (!id || !article) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const edit = new EditArticleRequest(article);

  if (!await edit.exists) {
    throw error(HttpStatus.NOT_FOUND, 'article not exists');
  }

  try {
    return json({
      edit: await edit.getEditable(locals.user.uid) as any,
    }, {
      status: HttpStatus.OK,
    });
  } catch (e: any) {
    return json({
      reason: e.toString(),
    }, {
      status: HttpStatus.BAD_GATEWAY,
    });
  }
}

export async function POST({params, locals, request}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    throw error(HttpStatus.UNAUTHORIZED);
  }

  const {id, article} = params;

  if (!id || !article) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const edit = new EditArticleRequest(article);

  if (!await edit.exists) {
    throw error(HttpStatus.NOT_FOUND, 'article not exists');
  }

  const data = new EditDto(await request.json());

  if (isEmpty(data.title)) {
    throw error(HttpStatus.NOT_ACCEPTABLE, 'title is too short');
  } else if (data.title!.length > 48) {
    throw error(HttpStatus.NOT_ACCEPTABLE, 'title is too long');
  }

  const tagError = await getTagErrors(id, article, locals.user, data.tags);

  if (tagError) {
    throw error(tagError.status, tagError.reason);
  }

  try {
    await edit.update(locals.user.uid, data);
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }

  edit.updateSearchEngine(id, data)
    .then()
    .catch();

  return new Response(undefined, {status: HttpStatus.CREATED});

}

class EditArticleRequest {
  private article: Article;

  constructor(private readonly id: string) {
    this.article = new Article(id);
  }

  get exists() {
    return this.article.exists;
  }

  async getEditable(userId: string): Promise<IEditable> {
    const {title, content, author, source} = await this.article.get();
    if (userId !== author) {
      throw new Error('your not author');
    }
    const userTags = await this.article.getAllMyTags(userId);
    const allTags = await this.article.getAllTagsCounted();
    let tagCounts = 0;
    for (const tag of Object.values(allTags)) {
      tagCounts += tag;
    }
    return {
      title: title ?? '',
      content: content ?? '',
      tags: userTags,
      source,
      tagCounts,
    };
  }

  async getImage(newContent: string): Promise<string> {
    if (isEmpty(newContent)) {
      return '';
    }

    const $ = loadHtml(newContent);
    const images = $('img');
    return isEmpty(images) ? '' : ($(images[0])?.attr('src')?.toString() ?? '');
  }

  async update(author: string, data: EditDto) {
    const {title, content, tags, source} = data;

    const sanitizedContent = await Article.Sanitize(content);

    const edited = {
      title,
      editedAt: new Date,
      content: sanitizedContent,
      source: source ?? '',
      images: await this.getImage(sanitizedContent),
    };

    await db.query(aql`
      for article in articles
        filter article._key == ${this.id} && article.author == ${author}
          update article with ${edited} in articles`);
    await this.article.updateTags(author, tags);
  }

  updateSearchEngine(board: string, data: EditDto) {
    return new Promise<void>(async (resolve) => {
      await domain.run(async () => {
        try {
          await client.index('articles')
            .updateDocuments([
              {
                board,
                id: this.id,
                title: data.title,
                source: data.source,
                content: striptags(data.content ?? '')
                  .replace(/&nbsp;/, '')
                  .slice(0, 500),
                tags: await this.article.getAllTagsCounted(),
              },
            ]);
        } finally {
          resolve();
        }
      });
    });
  }
}

const domain = create();

domain.on('error', () => {
  //
});

export interface IEditable {
  title: string;
  content: string;
  tags: ITag[];
  source: string;
  tagCounts: number;
}