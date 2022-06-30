import argon2 from 'argon2';
import db from '$lib/database/instance';
import {aql} from 'arangojs/aql';
import type {IArangoDocumentIdentifier} from '$lib/database';
import njwt from 'njwt';
import secureRandom from 'secure-random';
import {EUserRanks} from '$lib/types/user-ranks';

export const key =
  process.env.USE_SPECIFIC_KEY ?? secureRandom(256, {type: 'Buffer'});

console.log(key);

export class User {
  constructor(readonly id: string) {
  }

  private stored: IUserInfo | undefined;

  get data(): Promise<IUserInfo> {
    return new Promise<IUserInfo>(async (resolve, reject) => {
      if (!await this.exists) {
        return reject('user not exists');
      }

      db.query(aql`
        for user in users
          filter user.id == ${this.id}
            return user`)
        .then(async (cursor) => {
          if (!cursor.hasNext) {
            return reject('no user found');
          }
          resolve(await cursor.next());
        })
        .catch(reject);
    });
  }

  private async loadUserData() {
    if (!this.stored) {
      this.stored = await this.data;
    }
    return this.stored;
  }

  get exists(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      db.query(aql`
        for user in users
          filter user.id == ${this.id}
            return user`)
        .then(async (r) => {
          resolve(r.hasNext);
        })
        .catch(reject);
    });
  }

  async register(password: string) {
    if (await this.exists) {
      throw Error('user exists already');
    }

    const hashed = await argon2.hash(password);

    await db.query(aql`
      insert ${{id: this.id, password: hashed, rank: EUserRanks.User}} into users`);
  }

  /**
   *
   * @param password 비밀번호 평문
   */
  async verify(password: string): Promise<boolean> {
    try {
      const user = await this.loadUserData();
      return await argon2.verify(user.password, password);
    } catch (e) {
      console.log(e)
      return false;
    }
  }

  token(type: 'user' | 'refesh', payload: Rec<string> = {}) {
    return njwt.create({
      iss: 'https://now.gd/',
      sub: `user/${this.id}`,
      scope: type,
      ...payload,
    }, key);
  }
}

export interface IUserInfo extends IArangoDocumentIdentifier {
  password: string; // hashed
  rank: EUserRanks;
}