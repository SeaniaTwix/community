import db from '$lib/database/instance';
import {aql} from 'arangojs';
import type {EUserRanks} from '$lib/types/user-ranks';

export class Board {
  constructor(private readonly id: string) {
  }

  async create(title: string, pub: boolean) {
    const cursor = await db.query(aql`
      insert ${{title, pub}} into boards return NEW`);

    return await cursor.next();
  }

  async getMaxPage(amount = 30): Promise<number> {
    const cursor = await db.query(aql`return ceil(length(articles) / ${amount})`);
    return await cursor.next();
  }

  async getRecentArticles(page: number, amount: number) {
    /*
    const cursor = await db.query(aql`
      for article in articles
        sort article.createdAt desc
        limit ${(page - 1) * amount}, ${amount}
        let isPub = article.pub == null || article.pub == true
        filter article.board == ${this.id} && isPub
          let c = length(for c in comments filter c.article == article._key return c)
          let tags = (
            for userId in attributes(is_object(article.tags) ? article.tags : {})
              for tag in article.tags[userId]
                return tag.name)
          
          
          return merge(article, {comments: c, tags: tags})`);*/
    const cursor = await db.query(aql`
      for article in articles
        sort article.createdAt desc
        limit ${(page - 1) * amount}, ${amount}
        let isPub = article.pub == null || article.pub == true
        filter article.board == ${this.id} && isPub
          let c = length(
            for comment in comments
              let isCoPub = comment.pub == null || comment.pub
              filter comment.article == article._key && isCoPub
                return comment)
          let tags = (
            for savedTag in tags
              filter savedTag.target == article._key && savedTag.pub
                return savedTag.name)
          return merge(article, {comments: c, tags: tags})`)

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