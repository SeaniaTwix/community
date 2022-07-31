import type {User} from '$lib/auth/user/server';
import {Pusher} from '$lib/pusher/server';
import db from '$lib/database/instance';
import {aql} from 'arangojs';

export class Notifications {
  constructor(private readonly user: User) {
  }

  /**
   * db에 알림 내역을 저장하고,
   * @param context 어떤 곳에 관하여 알림이 온 것인지 설명합니다.
   *                게시글에 댓글이 달린 경우는 'article',
   *                대댓글 같은 경우는 'comment'가 될 수 있습니다.
   * @param body 이 알림의 세부 데이터입니다.
   * @param instigator 이 알림을 발생시킨 인물입니다. undefined 일 수 있는데,
   *                   이때는 발생 시킨 인물이 중요하지 않을 때 입니다.
   */
  async send(context: NotifyContext, body: INotify, instigator?: string) {
    // console.log(body);
    if (!await this.isAlreadyNotified(body)) {
      await this.saveToDb(body, instigator);

      Pusher.notify('notify', `notifications:${await this.user.uid}`, instigator ?? '0', body).then();
    }
  }

  /**
   * 알림 기록이 있는지 체크하고
   */
  private async isAlreadyNotified(body: INotify): Promise<boolean> {
    const cursor = await db.query(aql`
      for noti in notifications
        let nv = ${body.value}
        let isSameNotiString = is_string(nv) && nv == noti.value
        let isSameNotiNumber = is_number(nv) && nv <= noti.value
        filter (isSameNotiString || isSameNotiNumber) && noti.receiver == ${await this.user.uid}
        return noti`)
    return cursor.hasNext;
  }

  private async saveToDb(body: INotify, instigator?: string) {
    await db.query(aql`
      insert ${{
        ...body,
        instigator,
        receiver: await this.user.uid,
      }} into notifications`);
  }
}

export interface INotify {
  type: NotifyEventType,
  root: string,
  // 알림의 타겟 id입니다. 주로 알림이 발생한 게시글이나 댓글의 id입니다.
  target: string;
  /**
   * 댓글이나 대댓글의 경우는 해당 댓글의 id(string)가 오고, 추천 수 같은 경우는 추천 수(number)가 옵니다.
   * string 값이 오면 같은지 판단하여 알림 여부가 결정 되고, number가 오면 기록된 숫자보다 높아야 알림이 발생합니다.
   */
  value: number | string;
}

type NotifyContext = 'articles' | 'comments';
// vote - 추천 수가 10 단위가 될 때마다 발생합니다. 100 이상 값부터는 50 단위로 발생합니다.
// comment - 댓글
// reply - 대댓글
type NotifyEventType = 'comment' | 'reply' | 'vote';
