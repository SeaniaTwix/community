import db from '$lib/database/instance';
import {aql} from 'arangojs';
import type {EUserRanks} from '$lib/types/user-ranks';
import {uploadAllowedExtensions} from '$lib/file/image/shared';

export class Board {
  constructor(private readonly id: string) {
  }

  async create(title: string, pub: boolean) {
    const cursor = await db.query(aql`
      insert ${{title, pub}} into boards return NEW`);

    return await cursor.next();
  }

  async getMaxPage(amount = 30, requireLikes: number | null = null): Promise<number> {
    const cursor = await db.query(aql`
      let count = length(
        for article in articles
          filter article.board == ${this.id}
          let minLike = ${requireLikes}
          let savedTags = (
            for savedTag in tags
              filter savedTag.target == article._key && savedTag.pub
                return savedTag.name)
          
          let likeCount = length(for tn in savedTags filter tn == "_like" return tn)
          let dislikeCount = length(for tn in savedTags filter tn == "_dislike" return tn)
          filter is_number(minLike) ? likeCount - dislikeCount >= minLike : true
          
            return article)
      return max([1, ceil(count / ${amount})])`);
    return await cursor.next();
  }

  async getBests(page: number, reader: string | null, max = 5, minLikes = 3) {
    if (page <= 0) {
      throw new Error('page must be lt 0')
    }
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
            limit ${(page - 1) * max}, ${page * max}
            let tagNames = (
              for tag in tags
                filter tag.target == article._key && tag.pub
                  return tag.name)
            return merge(unset(article, "_rev", "_id", "content", "pub", "source", "tags"), {tags: tagNames})`)
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

  async getRecentArticles(page: number, amount: number, reader: string | null, showImage = false, requireLikes: number | null = null) {
    if (page <= 0) {
      throw new Error('page must be lt 0')
    }
    // console.log(requireLikes)
    const cursor = await db.query(aql`
      for article in articles
        sort article.createdAt desc
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
            return merge(unset(article, "content", "pub", "source", "_id", "_rev"), {comments: c, tags: savedTags, images: imgs, convertedImages: convertedImages, author: authorData})`)

    return await cursor.all();
  }

  get name(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      db.query(aql`
        for board in boards
          filter board._key == ${this.id}
            return board.name`)
        .then((cursor) => {
          cursor.next().then(resolve)
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
}

export interface INewBoardInfo {
  name: string;
  min: EUserRanks;
  blocked: boolean;
}