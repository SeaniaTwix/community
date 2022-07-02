import ky from 'ky-universal';

const dev = true;
const url = dev ? 'http://localhost:50000' : 'https://push.now.gd'

export class Pusher {
  static notify(about: PushAbout, context: string, body: unknown) {
    return ky.post(`${url}/notify`, {
      json: {
        context: `${context}/${about}`,
        body: JSON.stringify(body),
        key: process.env.PUSHER_KEY,
      }
    });
  }
}

type PushAbout = 'comments'