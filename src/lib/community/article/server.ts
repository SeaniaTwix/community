import db from '$lib/database/instance';
import {aql} from 'arangojs';

export class Article {

  title: string | undefined;
  content: string | undefined;

  constructor(private readonly id: string) {
  }

  post(title: string, content: string) {

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

  /**
   * 태그를 추가합니다. (누적도 동일)
   * @param tag 추가할 태그 이름입니다.
   */
  async addTag(tag: string) {
    if (/\s/.exec(tag) !== null) {
      throw new Error('whitespace not allowed in tag');
    }

    // todo: 태그 추가
  }

}