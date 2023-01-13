import type {Article} from '$lib/community/article/server';
import type {User} from '$lib/auth/user/server';
import type {IComment} from '$lib/types/comment';
import db from '$lib/database/instance';
import {aql} from 'arangojs';

export class Comment {
  readonly type = 'comment';
  constructor(readonly id: string) {
  }

  static async new(relative: Article, author: User, content: string): Promise<Comment> {
    const aid = relative.id;
    const uid = await author.uid;

    // todo

    return new Comment('');
  }

  async get(): Promise<IComment> {
    const cursor = await db.query(aql`
      for comment in comments
        filter comment._key == ${this.id}
          return comment`);
    return await cursor.next();
  }

  async exists(): Promise<boolean> {
    try {
      const cursor = await db.query(aql`
      for comment in comments
        filter comment._key == ${this.id}
          return comment`);
      return cursor.hasNext;
    } catch {
      return false;
    }
  }

  edit(newContent: string) {
    return db.query(aql`
      update {_key: ${this.id}} with {content: ${newContent}, editedAt: DATE_NOW()} in comments`)
  }

  unpub() {
    return db.query(aql`
      for comment in comments
        filter comment._key == ${this.id}
          update comment with {pub: false} in comments`)
  }

  del() {
    return db.query(aql`
      for comment in comments
        filter comment._key == ${this.id}
          remove comment in comments`)
  }

}