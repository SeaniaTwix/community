import type {Board} from '$lib/community/board/server';
import type {Article} from '$lib/community/article/server';
import type {Comment} from '$lib/community/comment/server';
import {User} from '$lib/auth/user/server';
import {EUserRanks} from '$lib/types/user-ranks';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {flags} from '$lib/community/permission/shared/flags';

export class Permissions {
  private user: User;
  constructor(private context: Board | Article | Comment | null, user: string | User) {
    if (user instanceof User) {
      this.user = user;
    } else {
      this.user = new User(user);
    }
  }

  static readonly FLAGS = flags;
  
  static readonly DefaultPermissions =
    Permissions.FLAGS.WRITE_ARTICLE |
    Permissions.FLAGS.READ_ARTICLE |
    Permissions.FLAGS.EDIT_ARTICLE |
    Permissions.FLAGS.DELETE_ARTICLE |
    Permissions.FLAGS.READ_COMMENT |
    Permissions.FLAGS.EDIT_COMMENT |
    Permissions.FLAGS.WRITE_COMMENT |
    Permissions.FLAGS.DELETE_COMMENT |
    Permissions.FLAGS.VIEW_BOARDLIST |
    Permissions.FLAGS.VIEW_ARTICLELIST
  ;

  private check(source: bigint, compare: bigint): boolean {
    // eslint-disable-next-line no-extra-boolean-cast
    return !!(source & Permissions.FLAGS.ALL) ? true : !!(source & compare);
  }

  hasOwn(permission: bigint): Promise<boolean> {
    return new Promise(async (resolve) => {
      if (await this.user.rank <= EUserRanks.Banned) {
        return resolve(false);
      }

      if (await this.user.rank >= EUserRanks.Admin) {
        return resolve(true);
      }

      const result = await this.get();

      if (!result) {
        return resolve(false);
      }

      return resolve(this.check(result, permission));
    });
  }

  async set(permission: bigint) {
    const search = {
      user: await this.user.uid,
      context: this.context?.type ?? null,
      target: this.context?.id ?? null,
    };
    const newPermission = {
      ...search,
      permissions: permission.toString(),
    };
    return await db.query(aql`
      upsert ${search} insert ${newPermission} update ${{permissions: permission.toString()}} in permissions`);
  }

  async enable(permission: bigint) {
    const current = await this.get() ?? Permissions.DefaultPermissions;
    if (!this.check(current, permission)) {
      await this.set(current ^ permission);
    }
  }

  async disable(permission: bigint) {
    const current = await this.get() ?? Permissions.DefaultPermissions;
    if (this.check(current, permission)) {
      await this.set(current ^ permission);
    }
  }

  async get(): Promise<bigint | null> {
    const search = {
      user: await this.user.uid,
      context: this.context?.type ?? null,
      target: this.context?.id ?? null,
    };

    const cursor = await db.query(aql`
        for p in permissions
          filter p.user == ${search.user} && p.context == ${search.context} && p.target == ${search.target}
            return p`);

    const data = await cursor.next();

    console.log(data);

    if (!data) {
      return null;
    }

    return BigInt(data.permissions);
  }

  async getAll() {
    const search = {
      user: await this.user.uid,
      context: this.context?.type ?? null,
      target: this.context?.id ?? null,
    };

    const cursor = await db.query(aql`
        for p in permissions
          filter p.user == ${search.user}
            return p`);

    return await cursor.all();
  }

}

export type UserPermissions = boolean | AdultCertification | [boolean, AdultCertification];
enum AdultCertification {
  None,
  Minors,
  Adults,
}