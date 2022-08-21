import { json as json$1 } from '@sveltejs/kit';
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
import {client} from '$lib/database/search';
import {striptags} from 'striptags';
import type {IUser} from '$lib/types/user';
import {Pusher} from '$lib/pusher/server';
import {getTagErrors} from '../../[article=integer]/api/tag/add';

export async function GET({params, locals: {user}}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!user) {
    return new Response(undefined, { status: HttpStatus.UNAUTHORIZED });
  }

  const {id} = params;

  const board = new Board(id);

  if (!await board.exists) {
    return new Response(undefined, { status: HttpStatus.NOT_FOUND });
  }

  const u = await User.findByUniqueId(user.uid);

  if (!u) {
    return new Response(undefined, { status: HttpStatus.BAD_GATEWAY });
  }

  return json$1({
  tags: await u.getUsersTags(),
}, {
    status: HttpStatus.OK
  });
}

// noinspection JSUnusedGlobalSymbols
export async function POST({request, params, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  // console.log('new write')
  const article = new ArticleDto<ClientToServerTagType>(await request.json());
  const write = new WriteRequest(article);

  if (isEmpty(write.title)) {
    return json$1({
  reason: 'title is too short',
}, {
      status: HttpStatus.NOT_ACCEPTABLE
    });
  } else if (write.title!.length > 48) {
    return json$1({
  reason: 'title is too long',
}, {
      status: HttpStatus.NOT_ACCEPTABLE
    });
  }

  if (params.id !== write.boardId) {
    return json$1({
  reason: 'board id invalid',
}, {
      status: HttpStatus.BAD_GATEWAY
    });
  }

  if (write.error) {
    return json$1({
  reason: write.error,
}, {
      status: HttpStatus.FORBIDDEN
    });
  }

  const tagError = await getTagErrors(params.id, null, locals, write.tags);

  if (tagError) {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
    return tagError;
  }

  let result;
  try {
    result = await write.saveToDB(locals.user.uid);
  } catch (e: any) {
    return json$1({
  reason: e.toString(),
}, {
      status: HttpStatus.FORBIDDEN
    });
  }

  try {
    await write.saveToSearchEngine();
  } catch (e) {
    console.log(e);
  }

  try {
    const user = await User.findByUniqueId(locals.user.uid);
    const userData = await user!.safeData;
    Pusher.notify('article', `@${params.id}`, locals.user.uid, {
      key: write.id,
      title: result!.title,
      image: result!.images,
      author: {
        id: user!.id,
        avatar: userData.avatar,
        rank: userData.rank,
      },
      tags: result!.tags,
    }).then();
  } catch {
    // it's ok
  }

  return json$1({
  id: write.id,
}, {
    status: write.status
  });
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

  async getImage(content?: string): Promise<string> {
    if (!content) {
      return '';
    }

    const $ = loadHtml(content);
    const images = $('img');
    return isEmpty(images) ? '' : ($(images[0])?.attr('src')?.toString() ?? '');
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

  /**
   *
   * @param userId 글을 쓴 사람의 유니크 id입니다.
   * @return notify 전용 값입니다.
   */
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

    const content = await Article.Sanitize(this.content);

    const data: Partial<IArticle> = {
      source: this.source,
      views: 0,
      title: this.title,
      content,
      // lazy
      tags: {},
      author: userId,
      createdAt: new Date(),
      board: this.boardId!,
      pub: true,
      locked: false,
      images: await this.getImage(content),
    };

    const cursor = await db.query(aql`INSERT ${data} INTO articles return NEW`);
    const {_key} = await cursor.next();

    this.id = _key;
    this.article = new Article(_key);

    await this.article.addTags(userId, this.tags);

    return {...data, tags: await this.article.getAllTagsCounted()};
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
        },
      ]);

  }

  get status(): number {
    return _.isEmpty(this.error) ? HttpStatus.CREATED : HttpStatus.BAD_REQUEST;
  }
}

//