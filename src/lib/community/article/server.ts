import db from '$lib/database/instance';
import {aql} from 'arangojs';

export class Article {

  title: string | undefined;
  content: string | undefined;

  constructor(readonly id: string) {
  }

  get exists(): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      db.query(aql`
      for article in articles
        filter article._key == ${this.id}
          return article`)
        .then((result: { hasNext: boolean | PromiseLike<boolean>; }) => {
          resolve(result.hasNext);
        })
        .catch(reject);
    });
  }

  addViewCount() {
    return db.query(aql`
      for article in articles
        filter article._key == ${this.id}
        let v = article.views != null ? article.views + 1 : 1
        update article with { views: v } in articles`);
  }

  /**
   * 태그를 추가합니다. (누적도 동일)
   * @param userId 태그 추가를 요청한 사용자 유니크 아이디입니다.
   * @param tags 추가할 태그 이름들입니다.
   */
  async addTags(userId: string, tags: string[]) {
    if (tags.find(tag => /\s/.test(tag))) {
      throw new Error('whitespace not allowed in tag');
    }

    const newTags = tags.map((tag) => ({
      name: tag,
      createdAt: new Date,
      pub: true,
    }));

    return await db.query(aql`
      for article in articles
        filter article._key == ${this.id}
          let userTags = has(article.tags, ${userId}) ? article.tags[${userId}] : []
          let conflict = intersection((for t in userTags return t.name), ${newTags.map(t => t.name)})
          let tags = (for forAdd in ${newTags}
              filter forAdd.name not in conflict
                return forAdd)
          update article with {
            tags: merge_recursive(article.tags, {
              ${userId}: append(userTags, tags)
            })
          } in articles`);
  }

}