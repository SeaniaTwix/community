import db from '../database/instance';
import {aql} from 'arangojs/aql';
import type {EUserRanks} from '../types/user-ranks';

export class BoardManager {
  constructor(private readonly id: string) {
  }

  create() {
    db.query(aql`
    insert ${{}}`);
  }

  get exists(): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      db.query(aql`
      for board from boards
        filter board._key == ${this.id}
          return bid`)
        .then((result) => {
          resolve(result.hasNext)
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