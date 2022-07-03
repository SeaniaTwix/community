import {Subject} from 'rxjs';
import type {Observable} from 'rxjs';
import type {CommentDto} from '$lib/types/dto/comment.dto';
import {isEmpty} from 'lodash-es';

export class Pusher {
  private readonly target: string;
  private wsList: WebSocket[] = [];

  constructor(context: string) {
    this.target = context;
  }

  close() {
    for (const ws of this.wsList) {
      ws.close();
    }
  }

  observable(about: 'comments'): Observable<{ body: CommentDto, socket: WebSocket }> {
    const dev = window.location.host.startsWith('localhost');
    const url = dev ? 'ws://localhost:50000' : 'wss://push.now.gd'
    const ws = new WebSocket(`${url}/subscribe/${this.target}/${about}`);

    if (isEmpty(this.wsList)) {
      window.onbeforeunload = () => {
        this.close();
      }
    }

    this.wsList.push(ws);
    const subject = new Subject<{ body: CommentDto, socket: WebSocket }>();
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
    }
    return subject.asObservable();
  }
}
