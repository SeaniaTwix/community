import { EUserRanks } from '@root/lib/types/user-ranks';
import type { PageServerLoad, Actions } from './$types';
import { error } from '@sveltejs/kit';
import HttpStatus from '@root/lib/http-status';
import db from '@root/lib/database/instance';
import { aql } from 'arangojs';
import type {IArangoDocumentIdentifier} from '$lib/database';
import {nanoid} from 'nanoid';

export const actions = {
  default: async ({locals, request}) => {
    if (!locals.user || locals.user.rank < EUserRanks.Manager) {
      throw error(HttpStatus.FORBIDDEN, '접근 권한이 없습니다.');
    }
    const data = await request.formData();

    const appName = data.get('name');
    if (!appName) {
      return {
        error: 'no-name',
      }
    }
    const scope = (data.get('scope') ?? '').toString();
    const callback = data.get('callback');
    if (!callback) {
      return {
        error: 'no-callback',
      }
    }

    const fallback = data.get('fallback');
    if (!fallback) {
      return {
        error: 'no-fallback',
      }
    }

    const checkCursor = await db.query(aql`
      for app in apps
        filter app.name == ${appName}
          return true`)
    const isExists = checkCursor.hasNext;

    if (isExists) {
      return {
        error: 'exists',
      }
    }

    const secret = nanoid(32);
    const newApp = {
      owner: locals.user.uid,
      name: appName,
      scope: scope.split(',').map(v => v.trim()).filter(v => v.length > 0),
      secret,
      callback,
      fallback,
    }

    const cursor = await db.query(aql`insert ${newApp} into apps return NEW`);
    const doc: IArangoDocumentIdentifier = await cursor.next();

    return {
      secret,
      key: doc._key,
    }
  }
} satisfies Actions;

export const load = (async ({locals, url: {searchParams}}) => {
  if (!locals.user || locals.user.rank < EUserRanks.Manager) {
    throw error(HttpStatus.FORBIDDEN, '접근 권한이 없습니다.');
  }

  const name = searchParams.get('name');

  if (!name || name.length <= 0) {
    // throw error(HttpStatus.BAD_GATEWAY, '비정상적인 어플리케이션 이름입니다.');
    return {
      mode: 'new'
    }
  }

  const app = new App(name);
  
  try {
    const data =  await app.load();
    return {app: data};
  } catch {
    // provide create page
    return {app: null};
  }
}) satisfies PageServerLoad;

class App {
  private _document: IArangoDocumentIdentifier & object | undefined;
  constructor(private readonly name: string) {}

  get document(): Promise<IArangoDocumentIdentifier & object> {
    return new Promise((res, rej) => {
      db.query(aql`for app in apps
        filter app.name == ${this.name}
        return app`)
        .then((cursor) => {
          if (!cursor.hasNext) {
            rej('not exists');
          }
          cursor.next().then(res);
        })
        .catch(rej);
    });
  }

  async isExists() {
    try {
      if (!this._document) {
        await this.load();
      }
      return true;
    } catch {
      return false;
    }
  }

  async load() {
    return this._document = await this.document;
  }

  async setScope(...scopes: string[]) {
    if (!await this.isExists() && !this._document) {
      throw new Error(`App(${this.name}) is not exists`);
    }

    // @ts-ignore
    const {_key, _id, _rev} = this._document;

    await db.query(aql`update _key with ${{scopes}} in apps`);
  }

}
