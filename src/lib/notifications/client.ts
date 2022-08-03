import {writable} from 'svelte/store';
import type {IPublicNotify} from '$lib/types/notify';
import {Pusher} from '$lib/pusher/client';
import ky from 'ky-universal';

export const unread = writable(false);
export const notifications = writable<IPublicNotify>(undefined);

export class NotificationsClient {
  private static pusher: Pusher;
  private static isUnloadEventRegistered = false;

  static init(uid: string, preloaded: IPublicNotify[] = []) {
    if (!this.isUnloadEventRegistered) {
      this.isUnloadEventRegistered = true;
      window.addEventListener('unload', () => this.pusher.close());
    }
    if (this.pusher) {
      this.pusher.close();
    }
    this.pusher = new Pusher(`notifications:${uid}`);
    this.pusher.subscribe('notify', this.sendEvent);

  }

  static async sendEvent({body}: { body: IPublicNotify }) {
    if (body.target) {
      if (body.type === 'comment' || body.type === 'reply') {
        const {content} = await ky
          .get(`/community/${body.root}/comments/${body.value}/api/read`)
          .json<{ content: string }>();
        body.content = content;
      } else if (body.type === 'vote') {
        body.content = `추천을 ${body.value}개 받았습니다.`;
      } else {
        body.content = '[지정되지 않음]';
      }


      notifications.set(body);
    }
  }

}
