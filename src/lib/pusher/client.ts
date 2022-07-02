import {Subject} from 'rxjs';

export class Pusher {
  private readonly context: string;
  private ws: WebSocket;

  constructor(context: string) {
    this.context = context;
    this.ws = new WebSocket(`wss://push.now.gd/subscribe/${this.context}`);
  }

  subscribe() {
    const subject = new Subject();
    this.ws.onmessage = (event) => {
      const body = JSON.parse(event.data);
      subject.next(body);
    }
    return subject.asObservable();
  }
}