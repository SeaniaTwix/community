import {Subject} from 'rxjs';
import type {Observable} from 'rxjs';
import {isEmpty} from 'lodash-es';
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
  private wsList: WebSocket[] = [];
  private subjects: Subject<any>[] = [];
  private timers: number[] = [];

  constructor(context: string) {
    this.target = context;
  }

  close() {
    for (const subject of this.subjects) {
      try {
        subject.complete();
        subject.unsubscribe();
      } catch (e) {
        console.log('pusher:', e);
      }
    }

    for (const ws of this.wsList) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('command:close');
      }
      ws.close(1000);
    }
  }

  private connect() {

  }

  observable<T>(about: PushAbout): Observable<{ body: T, socket: WebSocket }> {
    const dev = window.location.host.startsWith('localhost') || window.location.host.startsWith('192');
    const url = dev ? 'ws://localhost:50000' : 'wss://push.ru.hn';
    const ws = new WebSocket(`${url}/subscribe/${this.target}/${about}`);

    if (isEmpty(this.wsList)) {
      window.onbeforeunload = () => {
        this.close();
      };
    }

    this.wsList.push(ws);
    const subject = new Subject<{ body: T, socket: WebSocket }>();
    this.subjects.push(subject);
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

    ws.onclose = (close) => {
      this.timers.push(
        setInterval(() => {
          //
        }, 1000) as unknown as number,
      )
    }

    return subject.asObservable();
  }
}
