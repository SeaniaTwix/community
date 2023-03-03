import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {EUserRanks} from '$lib/types/user-ranks';
import {uploadAllowedExtensions} from '$lib/file/image/shared';
import type {ArticleDto, ServerToClientTagType} from '$lib/types/dto/article.dto';
import {error} from '$lib/kit';
import HttpStatus from 'http-status-codes';
import type {ArticleItemDto} from '$lib/types/dto/article-item.dto';
import {initAutoTag} from '$lib/community/shared/auto-tag';
import type {ListBoardRequest} from '@routes/community/[id=integer]/api/list/+server';
import type {User} from '$lib/auth/user/server';
import type {IBoard} from '$lib/types/board';
import type {PermissionType} from '$lib/types/permissions';
import type {IUserSession} from '@root/app';
import {ArticleSearch} from '@routes/community/api/search/+server';
import {inRange} from 'lodash-es';

type BoardType = 'default' | 'best';

export class Board {
  readonly type = 'board';

  constructor(readonly id: string) {
  }

  static async listAll() {
    const cursor = await db.query(aql`
      for board in boards
        filter board.pub
          return unset(board, "_id", "_rev")`);
    return await cursor.all();
  }

  private static paginate(current: number, max: number, range = 5) {
    // Calculate the minimum and maximum page numbers for the given range
    const minPage = Math.max(current - Math.floor(range / 2), 1);
    const maxPage = Math.min(minPage + range - 1, max);
    // Return a tuple with the min and max page numbers
    return [minPage, maxPage];
  }

  async render(pageRequest: ListBoardRequest, type: BoardType, locals: App.Locals, query?: string) {
    let articleFilter: string[] | undefined;

    if (query) {
      const search = new ArticleSearch('', query, pageRequest.page, pageRequest.amount);
      const result = await search.result();
      articleFilter = result.hits.map(v => v.id);
    }

    const list: ArticleDto[] = type === 'default' ?
      await pageRequest.getListRecents(locals?.user?.uid ?? null, articleFilter) as any[]
      : await pageRequest.getBestListRecents(locals?.user?.uid ?? null, articleFilter) as any[];

    let maxPage = type === 'default' ?
      await pageRequest.getMaxPage(locals?.user?.uid ?? null, articleFilter)
      : await pageRequest.getBestMaxPage(locals?.user?.uid ?? null, articleFilter);

    const page = pageRequest.page;

    if (page > maxPage) {
      throw error(HttpStatus.NOT_FOUND, 'Not found');
    }

    // todo: global setting for pagination range
    const paginated = Board.paginate(page, maxPage, 5);
    const minPage = paginated[0];
    maxPage = paginated[1];

    const {user, sessionId} = locals;

    const announcements = await this.getAnnouncements(page, user ? user.uid : sessionId!);

    const result: IArticleList = {
      articles: list
        .map((article) => {
          const {tags} = article;
          if (tags) {
            const counted: Rec<number> = {};
            for (const tag of tags) {
              if (counted[tag]) {
                counted[tag] += 1;
              } else {
                counted[tag] = 1;
              }
            }
            (<ArticleDto<ServerToClientTagType>><unknown>article).tags = counted;

            if (tags.includes('성인') && locals?.user?.adult !== true) {
              article.images = '';
            }
          }

          return article as unknown as ArticleItemDto;
        })
        .map(initAutoTag),
      user,
      name: await this.name,
      currentPage: page,
      minPage,
      maxPage,
      announcements,
      session: locals,
    };

    if (type === 'default') {
      result.bests = await this.getBests(user?.uid ?? null, 10, 1);
    }

    return result;
  }

  async create(title: string, pub: boolean) {
    const cursor = await db.query(aql`
      insert ${{title, pub}} into boards return NEW`);

    return await cursor.next();
  }

  async getMaxPage(reader: string | null, amount = 30, requireLikes: number | null = null, articleFilter?: string[]): Promise<number> {
    const cursor = await db.query(aql`
      let articleFilter = ${articleFilter ?? null}
      let skipFilter = articleFilter == null
      let count = length(
        for article in articles
          filter skipFilter || position(articleFilter, article._key)
          filter article.board == ${this.id}
          let minLike = ${requireLikes}
          let savedTags = (
            for savedTag in tags
              filter savedTag.target == article._key && savedTag.pub
                return savedTag.name)
          
          let likeCount = length(for tn in savedTags filter tn == "_like" return tn)
          let dislikeCount = length(for tn in savedTags filter tn == "_dislike" return tn)
          filter is_number(minLike) ? likeCount - dislikeCount >= minLike : true
          let reader = ${reader}
          let blockedTags = is_string(reader) ? flatten(
            for user in users
              filter user._key == reader
                return is_array(user.blockedTags) ? user.blockedTags : []
          ) : []
          let blockedUsers = is_string(reader) ? flatten(
            for user in users
              filter user._key == reader && has(user, "blockedUsers")
                return (for blockedUser in user.blockedUsers return blockedUser.key)
          ) : []
          
          filter blockedTags none in savedTags
          filter article.author not in blockedUsers
        return article)
          
      return max([1, ceil(count / ${amount})])`);
    return await cursor.next();
  }

  async getAnnouncements(page: number, reader: string): Promise<ArticleItemDto[]> {
    if (page <= 0) {
      throw new Error('page must be gt 0');
    }
    const cursor = await db.query(aql`
      let reader = ${reader}
      for article in articles
        sort article.createdAt desc
        let savedTags = (
          for savedTag in tags
            filter savedTag.target == article._key && savedTag.pub
              return savedTag.name)
        let revs = (
          for view in views
            filter view.reader == ${reader} && view.article._key == article._key
              return view.article._rev)
        filter "공지" in savedTags && (is_string(reader) ? article._rev not in revs : true)
          return keep(article, "_key", "_rev", "title", "createdAt", "board")`);
    return await cursor.all();
  }

  async getBests(reader: string | null, max = 5, minLikes = 3) {
    const cursor = await db.query(aql`
      for article in articles
        sort article.createdAt desc
        let isPub = article.pub == null || article.pub == true
        filter article.board == ${this.id} && isPub
        let likes = length(
          for tag in tags
            filter tag.name == "_like" && tag.target == article._key && tag.pub
              return tag)
        let dislikes = length(
          for tag in tags
            filter tag.name == "_dislike" && tag.target == article._key && tag.pub
              return tag)
        filter likes - dislikes >= ${minLikes}
        let reader = ${reader}
          let blockedTags = is_string(reader) ? flatten(
            for user in users
              filter user._key == reader
                return is_array(user.blockedTags) ? user.blockedTags : []
          ) : []
          let blockedUsers = is_string(reader) ? flatten(
            for user in users
              filter user._key == reader && has(user, "blockedUsers")
                return (for blockedUser in user.blockedUsers return blockedUser.key)
          ) : []
          
          let savedTags = (
            for savedTag in tags
              filter savedTag.target == article._key && savedTag.pub
                return savedTag.name)
          filter blockedTags none in savedTags
          filter article.author not in blockedUsers
            limit ${max}
            let tagNames = (
              for tag in tags
                filter tag.target == article._key && tag.pub
                  return tag.name)
            return merge(unset(article, "_rev", "_id", "content", "pub", "source", "tags"), {tags: tagNames})`);
    const results = await cursor.all();
    return results.map(article => {
      const tags: Record<string, number> = {};
      for (const tag of article.tags) {
        if (tags[tag]) {
          tags[tag] += 1;
        } else {
          tags[tag] = 1;
        }
      }
      article.tags = tags;
      return article;
    });
  }

  async getRecentArticles(
    page: number,
    amount: number,
    reader: string | null,
    showImage = false,
    requireLikes: number | null = null,
    articleFilter?: string[]) {
    if (page <= 0) {
      throw new Error('page must be lt 0');
    }

    if (!inRange(amount, 1, 50)) {
      throw new Error('amount must be in the range of 1 to 50');
    }

    // console.log(requireLikes)
    const cursor = await db.query(aql`
      let articleFilter = ${articleFilter ?? null}
      let skipFilter = articleFilter == null
      for article in articles
        sort article.createdAt desc
        filter skipFilter || position(articleFilter, article._key)
        let isPub = article.pub == null || article.pub == true
        filter article.board == ${this.id} && isPub
          let savedTags = (
            for savedTag in tags
              filter savedTag.target == article._key && savedTag.pub
                return savedTag.name)
          
          let minLike = ${requireLikes}
          let likeCount = length(for tn in savedTags filter tn == "_like" return tn)
          let dislikeCount = length(for tn in savedTags filter tn == "_dislike" return tn)
          filter is_number(minLike) ? likeCount - dislikeCount >= minLike : true
          
          let imgs = ${showImage} ? article.images : ((is_string(article.images) && length(article.images) > 0) || is_bool(article.images) && article.images)
          let imageSrcKey = ${showImage} ? regex_matches(imgs, ${'https:\\/\\/s3\\.ru\\.hn(.+)' + `(${uploadAllowedExtensions})$`}, true) : []
          let convertedImages = ${showImage} ? first(
            for image in images
              filter image.src == imageSrcKey[1]
                return image.converted) : []
          let reader = ${reader}
          let blockedTags = is_string(reader) ? flatten(
            for user in users
              filter user._key == reader
                return is_array(user.blockedTags) ? user.blockedTags : []
          ) : []
          let blockedUsers = is_string(reader) ? flatten(
            for user in users
              filter user._key == reader && has(user, "blockedUsers")
                return (for blockedUser in user.blockedUsers return blockedUser.key)
          ) : []
          let c = length(
            for comment in comments
              let isCoPub = comment.pub == null || comment.pub
              filter comment.article == article._key && isCoPub && comment.author not in blockedUsers
                return comment)
          filter blockedTags none in savedTags
          filter article.author not in blockedUsers
            limit ${(page - 1) * amount}, ${amount}
            let authorData = keep(first(for u in users filter u._key == article.author return u), "_key", "id", "avatar", "rank")
            let viewCount = length(
              for view in views
                filter view.article._key == article._key
                  return view)
            return merge(unset(article, "content", "pub", "source", "_id", "_rev"), {comments: c, tags: savedTags, images: imgs, convertedImages: convertedImages, author: authorData, views: viewCount})`);

    return await cursor.all();
  }

  get name(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      db.query(aql`
        for board in boards
          filter board._key == ${this.id}
            return board.name`)
        .then((cursor) => {
          cursor.next().then(resolve);
        })
        .catch(reject);
    });
  }

  get exists(): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      db.query(aql`
      for board in boards
        filter board._key == ${this.id}
          return board`)
        .then(async (result) => {
          // console.log(result.hasNext, await result.next())
          resolve(result.hasNext);
        })
        .catch(reject);
    });
  }

  async available(context: string, user: User): Promise<boolean> {
    if (await user.rank <= EUserRanks.Banned) {
      return false;
    }

    const cursor = await db.query(aql`
      return document("boards/${this.id}")})`);

    const board: IBoard = await cursor.next();
    const permissions = board.permissions ?? {};

    if (context in permissions) {
      // @ts-ignore
      const permission: PermissionType = permissions[context];

      if (typeof permission === 'boolean') {
        return permission;
      } else {
        const {min, user: userId} = permission;
        if (userId && min) {
          if (await user.uid === userId) {
            return await user.rank >= min;
          }
        } else if (min) {
          return await user.rank >= min;
        }

        return false;
      }
    }

    return true;
  }

  get minReqLikes(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      db
        .query(aql`
          let board = document(concat("boards/", ${this.id}))
          return has(board, "minReqLikes") ? board.minReqLikes : 1`)
        .then((cursor) => {
          cursor
            .next()
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
    });
  }

}

export interface INewBoardInfo {
  name: string;
  min: EUserRanks;
  blocked: boolean;
}

export interface IArticleList {
  articles: ArticleItemDto[];
  user?: IUserSession,
  name: string,
  currentPage: number,
  minPage: number,
  maxPage: number;
  announcements: ArticleItemDto[],
  session: App.Locals,
  bests?: ArticleItemDto[],
}