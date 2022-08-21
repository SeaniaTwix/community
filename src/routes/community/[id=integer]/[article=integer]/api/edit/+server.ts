import { json as json$1 } from '@sveltejs/kit';
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {Article} from '$lib/community/article/server';
import {EditDto} from '$lib/types/dto/edit.dto';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {load as loadHtml} from 'cheerio';
import {client} from '$lib/database/search';
import {striptags} from 'striptags';
import {isEmpty} from 'lodash-es';
import {getTagErrors} from '../tag/add';
import {create} from 'node:domain';

/**
 * 편집 전용 게시글 내용 소스 가져오기
 */
export async function GET({params, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return json$1({
  reason: 'please login and try again',
}, {
      status: HttpStatus.UNAUTHORIZED
    });
  }

  const {id, article} = params;
  const edit = new EditArticleRequest(article);

  try {
    if (!await edit.exists) {
      return json$1({
  reason: 'article not exists',
}, {
        status: HttpStatus.NOT_FOUND
      });
    }

    return json$1({
  edit: await edit.getEditable(locals.user.uid) as any,
}, {
      status: HttpStatus.OK
    });
  } catch (e: any) {
    return json$1({
  reason: e.toString(),
}, {
      status: HttpStatus.BAD_GATEWAY
    });
  }
}

export async function POST({params, locals, request}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return json$1({
  reason: 'please login and try again',
}, {
      status: HttpStatus.UNAUTHORIZED
    });
  }

  const {id, article} = params;
  const edit = new EditArticleRequest(article);

  try {
    if (!await edit.exists) {
      return json$1({
  reason: 'article not exists',
}, {
        status: HttpStatus.NOT_FOUND
      });
    }

    const data = new EditDto(await request.json());

    if (isEmpty(data.title)) {
      return json$1({
  reason: 'title is too short',
}, {
        status: HttpStatus.NOT_ACCEPTABLE
      })
    } else if (data.title!.length > 48) {
      return json$1({
  reason: 'title is too long',
}, {
        status: HttpStatus.NOT_ACCEPTABLE
      })
    }

    const tagError = await getTagErrors(id, article, locals, data.tags);

    if (tagError) {
      throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
      return tagError;
    }

    await edit.update(locals.user.uid, data);

    edit.updateSearchEngine(id, data)
      .then()
      .catch()

    return new Response(undefined, { status: HttpStatus.CREATED });

  } catch (e: any) {
    return json$1({
  reason: e.toString(),
}, {
      status: HttpStatus.BAD_GATEWAY
    });
  }
}

class EditArticleRequest {
  private article: Article;

  constructor(private readonly id: string) {
    this.article = new Article(id);
  }

  get exists() {
    return this.article.exists;
  }

  async getEditable(userId: string) {
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
    return {title, content, tags: userTags, source, tagCounts};
  }

  async getImage(newContent: string): Promise<string> {
    if (isEmpty(newContent)) {
      return '';
    }

    const $ = loadHtml(newContent);
    const images = $('img');
    return isEmpty(images) ? '' : ($(images[0])?.attr('src')?.toString() ?? '')
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
              }
            ]);
        } finally {
          resolve();
        }
      })
    });
  }
}

const domain = create();

domain.on('error', () => {
  //
});