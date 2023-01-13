import db from '$lib/database/instance';
import {aql} from 'arangojs';
import type {ArticleItemDto} from '$lib/types/dto/article-item.dto';
import type {User} from '$lib/auth/user/server';
import type {IArangoDocumentIdentifier} from '$lib/database';

export class Tag {
  constructor(private readonly name: string,
              private readonly user?: User) {
    //
  }

  static async findTaggedArticles(name: string): Promise<ArticleItemDto[]> {
    return [];
  }

  async alias(): Promise<string[]> {
    const cursor = await db.query(aql`
      let tag = document(concat("alias/" ${this.name}))
      return tag.alias`);
    return await cursor.next();
  }

  async appendAlias(...alias: string[]) {
    const newAlias: ITagAlias = {_key: this.name, alias};
    
    if (this.user) {
      newAlias.userId = await this.user.uid;
    }

    return await db.query(aql`
      let tag = document(concat("alias/", ${this.name}))
      upsert {_key: ${this.name}} insert ${newAlias} update {alias: append(a.alias, unique(${alias}))} into alias`);
  }

  async removeAlias(...alias: string[]) {
    const searchAlias: Partial<ITagAlias> = {
      _key: this.name,
      userId: await this.user?.uid
    }
    const newAlias = {_key: this.name, alias: []};
    return db.query(aql`
      let tag = document(concat("alias/", ${this.name}))
      upsert ${searchAlias} insert ${newAlias} update {alias: remove_values(a.alias, ${alias})} into alias`);
  }

}

export interface ITagAlias extends Partial<IArangoDocumentIdentifier> {
  alias: string[];
  userId?: string;
}
