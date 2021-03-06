import argon2 from 'argon2';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import type {IArangoDocumentIdentifier} from '$lib/database';
import njwt from 'njwt';
import {EUserRanks} from '$lib/types/user-ranks';
import {key} from './shared';
import type {IUser} from '$lib/types/user';
import {isStringInteger} from '$lib/util';
import {parseInt} from 'lodash-es';

type UnsafeUser = IUser & { password: string };

export class User {
  constructor(readonly id: string) {
  }

  private stored: UnsafeUser | undefined;

  get data(): Promise<UnsafeUser> {
    // console.trace('1');
    return new Promise<UnsafeUser>(async (resolve, reject) => {
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

  get safeData(): Promise<IUser> {
    return new Promise<IUser>((resolve, reject) => {
      this.loadUserData()
        .then((data) => {
          const {_key, _id, _rev, rank, id, profile, avatar} = data;
          resolve({_key, _id, _rev, rank, id, profile, avatar});
        })
        .catch(reject);
    });

  }

  private async loadUserData(): Promise<UnsafeUser> {
    if (!this.stored) {
      this.stored = await this.data;
    }
    return this.stored;
  }

  get uid(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.loadUserData()
        .then((user) => resolve(user._key))
        .catch(reject);
    });
  }

  get rank(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.loadUserData()
        .then((user) => resolve(user.rank))
        .catch(reject);
    });
  }

  get exists(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      // console.trace('user exists check:', this.id)
      db.query(aql`
        for user in users
          filter user.id == ${this.id}
            return user`)
        .then(async (r) => {
          // console.log(r)
          resolve(r.hasNext);
        })
        .catch(reject);
    });
  }

  static async findByUniqueId(uid?: string): Promise<User | null> {
    // console.trace('3');
    if (!uid) {
      return null;
    }
    if (!isStringInteger(uid)) {
      return null;
    }
    const cursor = await db.query(
      aql`for user in users filter user._key == ${uid} return user.id`,
    );
    if (!cursor.hasNext) {
      return null;
    }
    const id: string = await cursor.next();
    return new User(id);
  }

  static async getByUniqueId(uid?: string): Promise<UnsafeUser | null> {
    if (!uid) {
      return null;
    }
    try {
      // console.trace('4');
      const cursor = await db.query(aql`
      for user in users
        filter user._key == ${uid}
          return user`);
      return await cursor.next();
    } catch {
      return null;
    }
  }

  async register(password: string) {
    if (await this.exists) {
      throw Error('user exists already');
    }

    if (this.id.length < 3) {
      throw new Error('id invalid ( is that shorten than 3');
    }

    if (!password || password.length < 6) {
      throw Error('password invalid (is that shorten than 6)');
    }

    const hashed = await argon2.hash(password);

    await db.query(aql`
      insert ${{id: this.id, password: hashed, rank: EUserRanks.User}} into users`);
  }

  /**
   *
   * @param password ???????????? ??????
   */
  async verify(password: string): Promise<boolean> {
    try {
      const user = await this.loadUserData();
      return await argon2.verify(user.password, password);
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  token(type: 'user' | 'refresh', payload: Rec<unknown> = {}): njwt.Jwt {
    return njwt.create({
      iss: 'https://ru.hn/',
      sub: `user/${this.id}`,
      scope: type,
      ...payload,
    }, key);
  }

  async blockUser(key: string, reason: string) {
    await db.query(aql`
      for user in users
        filter user.id == ${this.id}
          let blockedUsers = unique(append(is_array(user.blockedUsers) ? user.blockedUsers : [], ${{key, reason}}))
          update user with {blockedUsers: blockedUsers} in users`);
  }

  async removeBlockedUsers(userIds: string[]) {
    await db.query(aql`
      for user in users
        filter user.id == ${this.id}
          let newBlockedUsers = (
            for blockedUser in user.blockedUsers
              filter blockedUser.key not in ${userIds}
                return blockedUser)
          update user with {blockedUsers: newBlockedUsers} in users`);
  }

  async getBlockedUsers(): Promise<string[]> {
    const cursor = await db.query(aql`
      for user in users
        filter user.id == ${this.id}
          return is_array(user.blockedUsers) ? user.blockedUsers : []`);
    return await cursor.next();
  }

  async blockTags(tagNames: string[]) {
    await db.query(aql`
      for user in users
        filter user.id == ${this.id}
          let blockedTags = unique(append(is_array(user.blockedTags) ? user.blockedTags : [], ${tagNames}))
          update user with {blockedTags: blockedTags} in users`);
  }

  async removeBlockedTags(tagNames: string[]) {
    await db.query(aql`
      for user in users
        filter user.id == ${this.id}
          let newBlockedTags = (
            for blockedTag in user.blockedTags
              filter blockedTag not in ${tagNames}
                return blockedTag)
          update user with {blockedTags: newBlockedTags} in users`);
  }

  async getBlockedTags(): Promise<string[]> {
    const cursor = await db.query(aql`
      for user in users
        filter user.id == ${this.id}
          return is_array(user.blockedTags) ? user.blockedTags : []`);
    return await cursor.next();
  }
}
