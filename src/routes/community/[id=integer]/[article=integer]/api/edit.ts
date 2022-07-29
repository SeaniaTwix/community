import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {Article} from '$lib/community/article/server';
import {EditDto} from '$lib/types/dto/edit.dto';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {load as loadHtml} from 'cheerio';
import {unified} from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize, {defaultSchema} from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import {client} from '$lib/database/search';
import {striptags} from 'striptags';
import {isEmpty} from 'lodash-es';

/**
 * 편집 전용 게시글 내용 소스 가져오기
 */
export async function GET({params, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return {
      status: HttpStatus.UNAUTHORIZED,
      body: {
        reason: 'please login and try again',
      },
    };
  }

  const {id, article} = params;
  const edit = new EditArticleRequest(article);

  try {
    if (!await edit.exists) {
      return {
        status: HttpStatus.NOT_FOUND,
        body: {
          reason: 'article not exists',
        },
      };
    }

    return {
      status: HttpStatus.OK,
      body: {
        edit: await edit.getEditable(locals.user.uid) as any,
      },
    };
  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString(),
      },
    };
  }
}

export async function POST({params, locals, request}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!locals.user) {
    return {
      status: HttpStatus.UNAUTHORIZED,
      body: {
        reason: 'please login and try again',
      },
    };
  }

  const {id, article} = params;
  const edit = new EditArticleRequest(article);

  try {
    if (!await edit.exists) {
      return {
        status: HttpStatus.NOT_FOUND,
        body: {
          reason: 'article not exists',
        },
      };
    }

    const data = new EditDto(await request.json());

    if (isEmpty(data.title)) {
      return {
        status: HttpStatus.NOT_ACCEPTABLE,
        body: {
          reason: 'title is too short',
        }
      }
    } else if (data.title!.length > 48) {
      return {
        status: HttpStatus.NOT_ACCEPTABLE,
        body: {
          reason: 'title is too long',
        }
      }
    }

    await edit.update(locals.user.uid, data);

    edit.updateSearchEngine(id, data)
      .then()
      .catch()

    return {
      status: HttpStatus.CREATED,
    };

  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString(),
      },
    };
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
    return {title, content, tags: userTags, source};
  }

  async getImage(): Promise<string> {
    const {content} = await this.article.get();
    if (!content) {
      return '';
    }

    const $ = loadHtml(content);
    const images = $('img');
    return isEmpty(images) ? '' : ($(images[0])?.attr('src')?.toString() ?? '')
  }

  async update(author: string, data: EditDto) {
    const {title, content, tags, source} = data;

    const sanitizedContent = await unified()
      .use(rehypeParse, {fragment: true})
      .use(rehypeSanitize, {
        ...defaultSchema,
        tagNames: [...defaultSchema.tagNames as any[], 'source'],
      })
      .use(rehypeStringify)
      .process(content ?? '');

    /*
    const newTags: ITag[] = tags.map(tag => ({
      target: this.id, user:author, name: tag, createdAt: new Date, pub: true
    })); // */

    const edited = {
      title,
      editedAt: new Date,
      content: sanitizedContent.value.toString(),
      source: source ?? '',
      images: await this.getImage(),
    };

    await db.query(aql`
      for article in articles
        filter article._key == ${this.id} && article.author == ${author}
          update article with ${edited} in articles`);
    await this.article.updateTags(author, tags);
  }

  async updateSearchEngine(board: string, data: EditDto) {
    await client.index('articles')
      .updateDocuments([
        {
          board,
          id: this.id,
          title: data.title,
          source: data.source,
          content: striptags(data.content ?? '').replace(/&nbsp;/, ''),
          tags: await this.article.getAllTagsCounted(),
        }
      ])
  }
}