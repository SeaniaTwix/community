import argon2 from 'argon2';
import db from '$lib/database/instance';
import {aql} from 'arangojs/aql';
import type {IArangoDocumentIdentifier} from '$lib/database';
import njwt from 'njwt';
import secureRandom from 'secure-random';
import {EUserRanks} from '$lib/types/UserRanks';

const key =
  process.env.USE_SPECIFIC_KEY ?? secureRandom(256, {type: 'Buffer'});

export class User {
  constructor(private readonly id: string) {
  }

  private stored: IUserInfo | undefined;

  get data(): Promise<IUserInfo> {
    return new Promise<IUserInfo>(async (resolve, reject) => {
      db.query(aql`
        for user in users
          filter user._key == ${this.id}
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
      const user = await this.loadUserData();
    })
  }

  async register(password: string) {
    await db.query(aql`
      insert ${{_key: this.id, password, rank: EUserRanks.User}} into users`);
  }

  async verify(password: string) {
    const user = await this.loadUserData();
    return await argon2.verify(user.password, password);
  }

  token(type: 'user' | 'refesh') {
    return njwt.create({
      iss: 'https://now.gd/',
      sub: `users/${this.id}`,
      scope: type,
    }, key);
  }
}

export interface IUserInfo extends IArangoDocumentIdentifier {
  password: string; // hashed
  rank: EUserRanks;
}