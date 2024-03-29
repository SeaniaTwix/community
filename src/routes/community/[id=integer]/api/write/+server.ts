import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
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
import {getTagErrors} from '../../[article=integer]/api/tag/add/+server';
import {error} from '$lib/kit';
import {Permissions} from '$lib/community/permission';

export async function GET({params, locals: {user}}: RequestEvent): Promise<Response> {
  if (!user) {
    return new Response(undefined, {status: HttpStatus.UNAUTHORIZED});
  }

  const {id} = params;

  if (!id) {
    throw error(HttpStatus.BAD_GATEWAY);
  }

  const board = new Board(id);

  if (!await board.exists) {
    throw error(HttpStatus.NOT_FOUND);
  }

  const u = await User.findByUniqueId(user.uid);

  if (!u) {
    throw error(HttpStatus.BAD_GATEWAY, 'user not found:' + user.uid);
  }

  return json({
    tags: await u.getUsersMostUsedTags(),
  });
}

// noinspection JSUnusedGlobalSymbols
export async function POST({request, params, locals}: RequestEvent): Promise<Response> {
  if (!locals.user) {
    throw error(HttpStatus.NOT_ACCEPTABLE, 'please login and try again');
  }

  const article = new ArticleDto<ClientToServerTagType>(await request.json());
  const user = await User.findByUniqueId(locals.user.uid);

  if (!user) {
    throw error(HttpStatus.UNAUTHORIZED);
  }

  const write = new WriteRequest(article, user);

  if (isEmpty(write.title)) {
    throw error(HttpStatus.NOT_ACCEPTABLE, 'title is too short');
  } else if (write.title!.length > 48) {
    throw error(HttpStatus.NOT_ACCEPTABLE, 'title is too long');
  }

  const {id} = params;

  if (!id || id !== write.boardId) {
    throw error(HttpStatus.BAD_GATEWAY, 'board id invalid');
  }

  if (write.error) {
    throw error(HttpStatus.BAD_GATEWAY, write.error);
  }

  const tagError = await getTagErrors(id, null, locals.user, write.tags);

  if (tagError) {
    throw error(tagError.status, tagError.reason);
  }

  let result;
  try {
    result = await write.submit(locals.user.uid);
  } catch (e: any) {
    throw error(HttpStatus.BAD_GATEWAY, e.toString());
  }

  try {
    await write.saveToSearchEngine();
  } catch (e) {
    console.error(e);
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

  return json({
    id: write.id,
  }, {
    status: write.status,
  });
}

class WriteRequest {
  error: string | null = null;
  id?: string;
  private board: Board;
  private article?: Article;
  private permission: Permissions;

  constructor(private body: ArticleDto<ClientToServerTagType>, user: User) {
    if (this.isTitleEmpty || this.isContentEmpty) {
      this.error = 'some field is empty';
    }

    if (!this.boardId) {
      this.error = 'invalid board id';
    }

    this.board = new Board(this.boardId!);
    this.permission = new Permissions(this.board, user);
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
  async submit(userId: string) {
    this.permission.hasOwn(Permissions.FLAGS.WRITE_ARTICLE);

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
      images: await Article.extractFirstImage(content),
      video: await Article.isContainsVideos(content),
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