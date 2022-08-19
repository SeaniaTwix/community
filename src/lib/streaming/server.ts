import type {User} from '$lib/auth/user/server';
import ky from 'ky-universal';
import db from '$lib/database/instance';
import {aql} from 'arangojs';

export class Streaming {
  constructor(private readonly user: User) {
  }

  async isAlreadyOnLive(): Promise<boolean> {
    const documentId = `streams/${await this.user.uid}`;
    const cursor = await db.query(aql`return document(${documentId})`);
    return cursor.hasNext;
  }

  get uid(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      try {
        const documentId = `streams/${await this.user.uid}`;
        const cursor = await db.query(aql`return document(${documentId})`);
        const streamData = await cursor.next();
        resolve(streamData.uid);
      } catch (e) {
        reject(e);
      }
    });
  }

  async create(name: string, mode: 'automatic' | 'off', category: string) {
    if (await this.isAlreadyOnLive()) {
      throw new Error('live stream already exists');
    }

    try {

      const {result: {uid}} = await ky.post(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ID}/stream/live_inputs`, {
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_TOKEN}`,
        },
        json: {
          meta: {
            name,
            category,
          },
          recording: {
            mode,
          },
        },
      }).json<ICloudflareCreatedLiveInputResponse>();

      await db.query(aql`insert {_key: ${await this.user.uid}, uid: ${uid}, createdAt: DATE_NOW()} in streams`);
    } catch (e) {
      console.trace(e);
    }
  }

  async remove() {
    const documentId = `streams/${await this.user.uid}`;
    return await db.query(aql`delete document(${documentId}) in streams`);
  }
}

interface ICloudflareCreatedLiveInputResponse {
  result: {
    uid: string,
    rtmps: IRtmp;
    rtmpPlayback: IRtmp;
    str: ISrt;
    strPlayback: ISrt;
    created: string | Date;
    modified: string | Date;
    meta: Record<string, string>,
    status: any;
    recording: {
      mode: 'automatic' | 'off';
      requireSignedURLs: boolean;
      allowedOrigins: string[] | null;
    };
    success: boolean;
    errors: any[];
    messages: any[];
  };
}

interface IRtmp {
  url: string;
  streamKey: string;
}

interface ISrt {
  url: string;
  streamId: string;
  passphrase: string;
}