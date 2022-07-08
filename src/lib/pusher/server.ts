import got from 'got';

const dev = Object.hasOwn(process.env, 'IS_DEV');
const url = dev ? 'http://localhost:50000' : 'https://push.ru.hn'

export class Pusher {
  static notify(about: PushAbout, context: string, userId: string, body: object) {
    return got.post(`${url}/notify`, {
      json: {
        context: `${context}/${about}`,
        body: JSON.stringify({...body, author: userId}),
        key: process.env.PUSHER_KEY,
      }
    });
  }
}

type PushAbout = 'comments'