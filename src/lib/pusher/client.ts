import {Subject, Subscription} from 'rxjs';
import type {Observable} from 'rxjs';
import type {PushAbout} from './shared';

try {
  if (!Object.hasOwn) {
    // eslint-disable-next-line no-prototype-builtins
    Object.hasOwn = (obj: object, item: string) => obj.hasOwnProperty(item);
  }
} catch {
  Object.hasOwn = (obj: object, item: string) => {
    return Object.keys(obj).includes(item);
  };
}

export class Pusher {
  private readonly target: string;
  private sockets: Record<string, WebSocket> = {};
  private subjects: Record<string, Subject<{ body: any, socket: WebSocket }>> = {};
  private subscriptions: Record<string, Subscription> = {};
  private timers: number[] = [];

  private reconnecting = false;

  constructor(context: string) {
    this.target = context;
    if (window) {
      window.addEventListener('unload', this.close);
      navigator.connection.addEventListener('change', this.networkChanged, true);
      window.addEventListener('online', this.online, true);
      window.addEventListener('offline', this.offline, true);
    }
  }

  private networkChanged() {
    console.log('network changed');
    // todo reconnect
  }

  destory() {
    this.close();
    navigator.connection.removeEventListener('change', this.networkChanged, true);
    window.removeEventListener('online', this.online, true);
    window.removeEventListener('offline', this.offline, true);
  }

  private online() {
    this.reconnecting = true;
  }

  private offline() {
    this.reconnecting = false;
  }

  close() {
    for (const url in this.sockets) {
      console.log('close:', url);
      this.clearConnection(url);
    }
  }

  clearConnection(url: string | URL) {
    const subject = this.subjects[url.toString()];
    if (subject) {
      subject.complete();
      subject.unsubscribe();
    }

    delete this.subjects[url.toString()];

    const ws = this.sockets[url.toString()];
    if (ws) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('command:close');
      }
      ws.close(1000);
    }

    delete this.sockets[url.toString()];

    const subscription = this.subscriptions[url.toString()];
    if (subscription) {
      subscription.unsubscribe();
    }

    delete this.subscriptions[url.toString()];
  }

  private connect(url: string | URL) {
    if (this.sockets[url.toString()]) {
      this.clearConnection(url);
    }

    this.sockets[url.toString()] = new WebSocket(url);

    const ws = this.sockets[url.toString()];
    const subject = new Subject<{ body: any, socket: WebSocket }>();

    this.subjects[url.toString()] = subject;

    ws.onmessage = (event) => {
      try {
        let body = JSON.parse(event.data);

        // hack for escaping backslash
        if (typeof body === 'string') {
          body = JSON.parse(body);
        }

        if (Object.hasOwn(body, 'context') && body.context === 'ping') {
          ws.send(JSON.stringify({pong: 'hello'}));
          return;
        }

        subject.next({body, socket: ws});
        // console.log(event.data, JSON.parse(event.data))
      } catch (e) {
        console.error(e);
      }
    };

    ws.onclose = () => {
      this.timers.push(
        setInterval(() => {
          //
        }, 1000) as unknown as number,
      )
    }

    return subject;
  }

  private static GetURL() {
    const dev = window.location.host.startsWith('localhost') || window.location.host.startsWith('192');
    return dev ? 'ws://localhost:50000' : 'wss://push.ru.hn';
  }

  observable<T>(about: PushAbout): Observable<{ body: T, socket: WebSocket }> {
    const url = Pusher.GetURL();
    const subject = this.connect(`${url}/subscribe/${this.target}/${about}`);

    // todo: listen event network changed, set online offline

    return subject.asObservable();
  }

  subscribe<T>(about: PushAbout, when: (data: { body: T, socket: WebSocket }) => void): Subscription {
    const obs = this.observable<T>(about);
    const subscription = obs.subscribe(when);

    const url = Pusher.GetURL();
    this.subscriptions[`${url}/subscribe/${this.target}/${about}`] = subscription;

    return subscription;
  }
}
