import db from '../database/instance';
import {aql} from 'arangojs/aql';

export class ArticleManage {

  title: string | undefined;
  content: string | undefined;

  constructor(private readonly id: string) {
  }

  get exists(): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      db.query(aql`
      for article in articles
        filter article._key == ${this.id}
          return article`)
        .then((result) => {
          resolve(result.hasNext);
        })
        .catch(reject);
    });
  }


}