import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import _, {isEmpty} from 'lodash-es';
import HttpStatus from 'http-status-codes';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {Board} from '$lib/community/board/server';
import {ArticleDto} from '$lib/types/dto/article.dto';
import type {ClientToServerTagType} from '$lib/types/dto/article.dto';
import {User} from '$lib/auth/user/server';
import type {IArticle} from '$lib/types/article';
import {Article} from '$lib/community/article/server';
import {load as loadHtml} from 'cheerio';
import {unified} from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize, {defaultSchema} from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import {client} from '$lib/database/search';
import {striptags} from 'striptags';
import type {IUser} from '$lib/types/user';

// noinspection JSUnusedGlobalSymbols
export async function POST({request, params, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  // console.log('new write')
  const article = new ArticleDto<ClientToServerTagType>(await request.json());
  const write = new WriteRequest(article);

  if (isEmpty(write.title)) {
    return {
      status: HttpStatus.NOT_ACCEPTABLE,
      body: {
        reason: 'title is too short',
      }
    }
  } else if (write.title!.length > 48) {
    return {
      status: HttpStatus.NOT_ACCEPTABLE,
      body: {
        reason: 'title is too long',
      }
    }
  }

  if (params.id !== write.boardId) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: 'board id invalid',
      },
    };
  }

  if (write.error) {
    return {
      status: HttpStatus.FORBIDDEN,
      body: {
        reason: write.error,
      },
    };
  }

  try {
    await write.saveToDB(locals.user.uid);
  } catch (e: any) {
    return {
      status: HttpStatus.FORBIDDEN,
      body: {
        reason: e.toString(),
      },
    };
  }

  try {
    await write.saveToSearchEngine();
  } catch (e) {
    console.log(e);
  }

  return {
    status: write.status,
    body: {
      id: write.id,
    },
  };
}

class WriteRequest {
  error: string | null = null;
  id?: string;
  private board: Board;
  private article?: Article;

  constructor(private body: ArticleDto<ClientToServerTagType>) {
    if (this.isTitleEmpty || this.isContentEmpty) {
      this.error = 'some field is empty';
    }

    if (!this.boardId) {
      this.error = 'invalid board id';
    }

    this.board = new Board(this.boardId!);
  }

  get boardId(): string | undefined {
    return this.body.board;
  }

  get title(): string | undefined {
    return this.body.title?.trim();
  }

  get source(): string {
    return this.body.source ?? '';
  }

  get tags(): string[] {
    const tagsList = this.body.tags as string[] ?? [];
    const isNotEmpty = (v: any) => !isEmpty(v);
    const filtered = tagsList.filter(isNotEmpty);
    // tag limit max
    return filtered.map(v => v.trim()).slice(0, 20);

    /*
    const tags = {[userId]: [] as any[]};

    for (const name of mapped) {
      tags[userId].push({
        name,
        createdAt: new Date,
        pub: true,
      });
    }

    return tags; */
  }

  get content(): string | undefined {
    return this.body.content?.trim();
  }

  get isImageExists(): boolean {
    const content = this.content;
    if (!content) {
      return false;
    }

    const $ = loadHtml(content);
    const images = $('img');
    return images.length > 0;
  }

  private get isBoardExists(): Promise<boolean> {
    return this.board.exists;
  }

  get isTitleEmpty(): boolean {
    return _.isEmpty(this.title);
  }

  get isContentEmpty(): boolean {
    return _.isEmpty(this.content);
  }

  async saveToDB(userId: string) {
    if (!await this.isBoardExists) {
      this.error = 'board not exsists';
      return;
    }

    const user = await User.getByUniqueId(userId);
    // console.log(userId, user)
    // const uid = await user.data;
    if (!user) {
      this.error = 'user not exists';
      return;
    }

    const sanitizedContent = await unified()
      .use(rehypeParse, {fragment: true})
      .use(rehypeSanitize, {
        ...defaultSchema,
        tagNames: [...defaultSchema.tagNames ?? [], 'source']
      })
      .use(rehypeStringify)
      .process(this.content ?? '')

    const data: Partial<IArticle> = {
      source: this.source,
      views: 0,
      title: this.title,
      content: sanitizedContent.value.toString(),
      // lazy
      tags: {},
      author: userId,
      createdAt: new Date(),
      board: this.boardId!,
      pub: true,
      locked: false,
      images: this.isImageExists,
    };

    const cursor = await db.query(aql`INSERT ${data} INTO articles return NEW`);
    const {_key} = await cursor.next();

    this.id = _key;
    this.article = new Article(_key);

    // auto tag server side code

    /*
    const autoTag = /^[[(]?([a-zA-Z가-힣@]+?)[\])]/gm;
    const resultAutoTag = autoTag.exec(data.title!);
    let tags = this.tags;
    if (resultAutoTag) {
      const autoTagText = resultAutoTag[1];
      tags = [autoTagText, ...tags];
    } // */

    await this.article.addTags(userId, this.tags);
  }

  async saveToSearchEngine() {
    const article = new Article(this.id!);
    const data = await article.get();
    // @ts-ignore
    const user: IUser & { password: string } = await User.getByUniqueId(data.author!);
    await client.index('articles')
      .addDocuments([
        {
          board: this.boardId,
          id: article.id,
          title: this.title,
          source: data.source,
          author: {
            uid: user._key,
            name: user.id,
          },
          content: striptags(this.content ?? '').replace(/&nbsp;/, ''),
          tags: await article.getAllTagsCounted(),
          createdAt: (new Date(data.createdAt!)).getTime(),
        }
      ]);

  }

  get status(): number {
    return _.isEmpty(this.error) ? HttpStatus.CREATED : HttpStatus.BAD_REQUEST;
  }
}