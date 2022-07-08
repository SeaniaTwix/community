import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import _, {isEmpty} from 'lodash-es';
import HttpStatus from 'http-status-codes';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {Board} from '$lib/community/board/server';
import {ArticleDto} from '$lib/types/dto/article.dto';
import {User} from '$lib/auth/user/server';
import type {IArticle} from '$lib/types/article';

// noinspection JSUnusedGlobalSymbols
export async function post({request, params, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const article = new ArticleDto(await request.json());
  const write = new WriteRequest(article);

  if (params.id !== write.boardId) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: 'board id invalid',
      }
    }
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

  constructor(private body: ArticleDto) {
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

  get tags(): string[] {
    const tagsList = this.body.tags as string[] ?? [];
    const isNotEmpty = (v: any) => !isEmpty(v);
    const filtered = tagsList.filter(isNotEmpty);
    return filtered.map(v => v.trim());

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

    const data: Partial<IArticle> = {
      title: this.title,
      content: this.content,
      // lazy
      tags: {},
      author: userId,
      createdAt: new Date(),
      board: this.boardId!,
      pub: true,
      locked: false,
    };

    const cursor = await db.query(aql`INSERT ${data} INTO articles return NEW`);
    const {_key} = await cursor.next();

    this.id = _key;
    const article = new Article(_key);

    await article.addTags(userId, this.tags);
  }

  get status(): number {
    return _.isEmpty(this.error) ? HttpStatus.CREATED : HttpStatus.BAD_REQUEST;
  }
}