import db from '$lib/database/instance';
import {aql} from 'arangojs';
import type {ArticleDto} from '$lib/types/dto/article.dto';
import type {CommentDto} from '$lib/types/dto/comment.dto';
import type {ITag} from '$lib/types/tag';
import type {IArticle} from '$lib/types/article';
import type {IComment} from '$lib/types/comment';
import {inRange} from 'lodash-es';

export class Article {

  title: string | undefined;
  content: string | undefined;

  constructor(readonly id: string) {
  }

  async get(): Promise<IArticle> {
    const cursor = await db.query(aql`
      for article in articles
        filter article._key == ${this.id}
          return article`);
    return await cursor.next();
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

  async getComments(page: number, amount: number) {
    const cursor = await db.query(aql`
      for comment in comments
        sort comment.createdAt asc
        let isPub = comment.pub == null || comment.pub
        filter comment.article == ${this.id} && isPub
         limit ${(page - 1) * amount}, ${amount}
         return comment`);
    return await cursor.all();
  }

  addViewCount() {
    return db.query(aql`
      for article in articles
        filter article._key == ${this.id}
        let v = article.views != null ? article.views + 1 : 1
        update article with { views: v } in articles`);
  }

  /**
   * pub 태그만 가져옵니다.
   */
  async getAllTags(): Promise<ITag[]> {
    const cursor = await db.query(aql`
      for tag in tags
        filter tag.target == ${this.id} && tag.pub
          return tag`);
    return await cursor.all();
  }

  async getAllTagsCounted(): Promise<Record<string, number>> {
    const tags = await this.getAllTags();
    const result: Record<string, number> = {};
    for (const tag of tags) {
      if (!Object.hasOwn(result, tag.name)) {
        result[tag.name] = 1;
      } else {
        result[tag.name] += 1;
      }
    }
    return result;
  }

  async getAllMyTags(user: string): Promise<ITag[]> {
    const cursor = await db.query(aql`
      for tag in tags
        filter tag.target == ${this.id} && tag.pub && tag.user == ${user}
          return tag`);
    return await cursor.all();
  }

  /**
   * 태그를 추가합니다. (누적도 동일) 1~36 글자 외의 태그는 자동으로 제거 됩니다.
   * @param userId 태그 추가를 요청한 사용자 유니크 아이디입니다.
   * @param tags 추가할 태그 이름들입니다.
   */
  async addTags(userId: string, tags: string[]) {
    if (tags.find(tag => /\s/.test(tag))) {
      throw new Error('whitespace not allowed in tag');
    }

    const newTags = tags.filter(tag => inRange(tag.trim().length, 1, 36))
      .map((tag) => ({
        target: this.id,
        user: userId,
        name: tag,
        createdAt: new Date,
        pub: true,
      }));

    return await db.query(aql`
      for newTag in ${newTags}
        let sameTag = (
          for savedTag in tags
            filter newTag.target == savedTag.target && newTag.name == savedTag.name && newTag.user == savedTag.user
              return savedTag)
        let len = length(sameTag)
        filter len <= 0 || (len > 0 && sameTag[0].pub == false)
          upsert { _key: sameTag[0]._key } 
            insert newTag 
            update { _key: sameTag[0]._key, pub: true }
          in tags`)

    /*
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
          } in articles`);*/
  }

  /**
   * 해당 게시물에 지금까지 자신이 입력한 태그를 모두 지우고
   * 새 태그를 등록합니다.
   */
  async updateTags(userId: string, tags: string[]) {
    if (tags.find(tag => /\s/.test(tag))) {
      throw new Error('whitespace not allowed in tag');
    }

    await db.query(aql`
      for savedTag in tags
        filter savedTag.target == ${this.id} && savedTag.user == ${userId}
          update savedTag with {pub: false} in tags`);

    return this.addTags(userId, tags);
  }

  removeTags(userId: string, tags: string[]) {
    if (tags.find(tag => /\s/.test(tag))) {
      throw new Error('whitespace not allowed in tag');
    }

    console.log(tags, this.id, userId);

    return db.query(aql`
      for savedTag in tags
        filter savedTag.name in ${tags} && savedTag.target == ${this.id} && savedTag.user == ${userId}
          update savedTag with {pub: false} in tags`);


    /*
    const r = await db.query(aql`
      for article in articles
        filter article._key == ${this.id}
          let userTags = has(article.tags, ${userId}) ? article.tags[${userId}] : []
          let newTags = (
            for t in userTags
              filter t.name not in ${tags}
                return t)
          update article with merge_recursive(article, { 
            tags: {
              ${userId}: newTags,
            }
          }) in articles`);

    console.dir(await r.next(), {depth: 3}) */
  }

  async addComment(userId: string, comment: CommentDto): Promise<IComment> {
    const cursor = await db.query(aql`
      insert merge(${comment}, {
        author: ${userId},
        createdAt: ${new Date()},
        "like": 0,
        dislike: 0
      }) into comments return NEW`)
    return await cursor.next();
  }

  /**
   * 작성자의 `연재:` 태그로 시작하는 같은 작품의 모든 글을 작성 순서대로 반환합니다.
   * @return 관련 회차 모든 게시글 ID (현재 글도 포함 되어있음)
   */
  async getSerialArticleIds(): Promise<string[]> {
    try {
      const cursor = await db.query(aql`
      for article in articles
        filter article._key == ${this.id}
        let serialTag = first(
          for tag in tags
            filter tag.target == article._key && regex_test(tag.name, "^연재:.+")
              return tag)
        let serialsIds = (
          for tag in tags
            filter tag.name == serialTag.name && tag.user == article.author
              return tag.target)
        return serialsIds`);
      return await cursor.next();
    } catch {
      return [];
    }
  }

}