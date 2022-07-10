import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {Article} from '$lib/community/article/server';
import {EditDto} from '$lib/types/dto/edit.dto';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import type {ITag} from '$lib/types/tag';

/**
 * 편집 전용 게시글 내용 소스 가져오기
 */
export async function get({params, locals}: RequestEvent): Promise<RequestHandlerOutput> {
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

export async function post({params, locals, request}: RequestEvent): Promise<RequestHandlerOutput> {
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

    await edit.update(locals.user.uid, data);

    return {
      status: HttpStatus.CREATED,
    }

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
    const {title, content, tags, author, source} = await this.article.get();
    if (userId !== author) {
      throw new Error('your not author');
    }
    return {title, content, tags: tags![userId], source};
  }

  async update(author: string, data: EditDto) {
    const {title, content, tags, source} = data;
    const newTags: ITag[] = tags.map(tag => ({name: tag, createdAt: new Date, pub: true}));
    await db.query(aql`
      for article in articles
        filter article._key == ${this.id} && article.author == ${author}
          update article with {
            title: ${title},
            content: ${content},
            source: ${source ?? ''},
            tags: merge_recursive(article.tags, {
              ${author}: ${newTags}
            })
          } in articles`);
  }
}