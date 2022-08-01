import {create} from 'node:domain';
import got from 'got';
import type {PushAbout} from './shared';

const dev = Object.hasOwn(process.env, 'IS_DEV');
const url = dev ? 'http://localhost:50000' : 'https://push.ru.hn';
const domain = create();

domain.on('error', () => {
  //
});

export class Pusher {
  static notify(about: PushAbout, context: string, userId: string, body: object, auth = false) {
    return new Promise<void>((resolve) => {
      domain.run(async () => {
        try {
          got.post(`${url}/notify`, {
            json: {
              context: `${context}/${about}`,
              body: JSON.stringify({author: userId, ...body, auth}),
              key: process.env.PUSHER_KEY,
            },
          }).then().catch();
        } finally {
          resolve();
        }
      });
    });
  }
}