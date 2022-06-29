import {Database} from 'arangojs';
import assert from 'node:assert/strict';
import * as process from 'process';
import type {AqlQuery} from 'arangojs/aql';

export default class DefaultDatabase {
  private static url = 'http://localhost:8529';
  private static readonly dbName = 'community';
  private static readonly requireCollections = [
    'users', 'boards', 'articles', 'comments',
  ];

  private static get info(): IDatabaseInfo {
    return {
      user: process.env.DB_USER ?? 'root',
      url: process.env.DB_ENDPOINT ?? 'http://localhost:8529',
      password: process.env.DB_PASSWORD ?? 'root',
    }
  }

  private system: Database;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private db: Database = null;

  constructor() {
    DefaultDatabase.url = DefaultDatabase.info.url;
    this.system = new Database(DefaultDatabase.url);
    this.init().then();
  }

  private async init() {
    // console.log('init')
    const info = DefaultDatabase.info;
    const token = await this.system.login(info.user, info.password);
    const authorized = this.system.useBearerAuth(token);
    const list = await authorized.listDatabases();
    // console.log(info, authorized, list)

    if (!list.includes(DefaultDatabase.dbName)) {
      await authorized.createDatabase(DefaultDatabase.dbName);
    }

    this.db = authorized.database(DefaultDatabase.dbName);

    assert.equal(!!this.db, true);

    let created = 0;
    for (const collectionName of DefaultDatabase.requireCollections) {
      const collection = this.db.collection(collectionName);
      if (!await collection.exists()) {
        console.log(`컬렉션 '${collectionName}'을 찾을 수 없었습니다. 생성합니다.`);
        await collection.create();
        created++;
      }
    }

    if (created > 0) {
      console.log('필요한 컬렉션을 모두 생성했습니다.');
    }
    console.log('데이터베이스 사용 준비가 완료되었습니다.');
  }

  query(q: AqlQuery) {
    return this.db.query(q);
  }
}

interface IDatabaseInfo {
  url: string;
  user: string;
  password: string;
}

export interface IArangoDocumentIdentifier {
  _key: string;
  _id: string;
  _rev?: string;
}