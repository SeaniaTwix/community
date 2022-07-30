import {CollectionType, Database} from 'arangojs';
import assert from 'node:assert/strict';
import * as process from 'process';
import type {AqlQuery} from 'arangojs/aql';
import {Mutex} from 'async-mutex';
import type {ArrayCursor} from 'arangojs/cursor';
import type {EnsureFulltextIndexOptions} from 'arangojs/indexes';
// import type {MutexInterface} from 'async-mutex';

const mutex = new Mutex;

export default class DefaultDatabase {
  private static url = process.env.DB_ENDPOINT ?? 'http://localhost:8529';
  private static readonly dbName = 'community';
  private static readonly requireCollections = [
    'users', 'boards', 'articles', 'comments', 'tags', 'alias', 'notifications', 'favorites',
  ];
  private static readonly requireEdgeCollections = [
    'reply'
  ]
  private static readonly fulltextRequires: Record<string, EnsureFulltextIndexOptions[]> = {
    'articles': [
      {
        fields: ['title'],
        inBackground: false,
        minLength: 1,
        name: 'title',
        type: 'fulltext'
      },
      {
        fields: ['content'],
        inBackground: false,
        minLength: 1,
        name: 'content',
        type: 'fulltext'
      }
    ]
  }

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
    // this.init().then();
  }

  private async init() {
    if (this.db) {
      return;
    }

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

    for (const collectionName of DefaultDatabase.requireEdgeCollections) {
      const edge = this.db.collection(collectionName);
      if (!await edge.exists()) {
        console.log(`에지 '${collectionName}'을 찾을 수 없었습니다. 생성합니다.`);
        await edge.create({type: CollectionType.EDGE_COLLECTION});
        created++;
      }
    }

    if (created > 0) {
      console.log('필요한 컬렉션을 모두 생성했습니다.');
    }

    for (const collectionName in DefaultDatabase.fulltextRequires) {
      const collection = this.db.collection(collectionName);
      const settings = DefaultDatabase.fulltextRequires[collectionName];
      for (const setting of settings) {
        await collection.ensureIndex(setting);
      }
    }

    console.log('데이터베이스 사용 준비가 완료되었습니다.');
  }

  private async relogin() {
    const info = DefaultDatabase.info;
    const token = await this.system.login(info.user, info.password);
    const authorized = this.system.useBearerAuth(token);
    this.db = authorized.database(DefaultDatabase.dbName);
    assert.equal(!!this.db, true);
  }

  async query<T = any>(q: AqlQuery): Promise<ArrayCursor<T>> {
    const release = await mutex.acquire();
    try {
      await this.init();
      return await this.db.query(q);
    } catch (e: any) {
      if (e.errorNum === 11) {
        await this.relogin();
        return await this.db.query(q);
      }
      throw e;
    } finally {
      release();
    }
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