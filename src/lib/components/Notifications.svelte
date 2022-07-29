<script lang="ts">
  import {notifications} from '$lib/notifications/client';
  import type {IUser} from '$lib/types/user';
  import ky from 'ky-universal';
  import Notification from './Notification.svelte';
  import {nanoid} from 'nanoid';
  import {page, session} from '$app/stores';
  import {goto} from '$app/navigation';
  import {onMount, onDestroy} from 'svelte';

  import {Pusher} from '$lib/pusher/client';
  import type {Subscription} from 'rxjs';
  import {currentReply} from '../community/comment/client';

  let pusher: Pusher;
  let subscriptions: Subscription[] = [];
  const names: Record<string, string> = { 0: '', };
  let stored: ISimpleNoti[] = [];

  function checkNoti(event: CustomEvent<string>) {

  }

  function gotoNoti(event: CustomEvent<string>) {
    const noti = stored.find(n => n.key === event.detail);
    if (noti) {
      goto(noti.goto);
    }
  }

  function whenNewNotify({body}: {body: ISimpleNoti}) {

  }

  function clearPusher() {
    for (const sub of subscriptions) {
      sub.unsubscribe();
    }
    pusher?.close();
  }

  onMount(() => {
    document.addEventListener('unload', clearPusher);

    /*
    session.subscribe((current) => {
      pusher = new Pusher(`notifications:${current.user.uid}`);
      const obs = pusher.observable<ISimpleNoti>('notify');
      subscriptions.push(
        obs.subscribe(whenNewNotify)
      )
    }) */
  });

  onDestroy(() => {
    clearPusher();
  });

  notifications.subscribe(async (notify) => {
    if (notify) {
      if (!notify.type) {
        return;
      }

      if (!names[notify.author]) {
        const ur = await ky.get(`/user/profile/api/detail?id=${notify.author}`);
        const result = await ur.json<{ user: IUser }>();
        names[notify.author] = result.user.id;
      }

      const n = names[notify.author];
      const key = nanoid(16);

      const {title} = await ky.get(
        `/community/${notify.root}/${notify.target}/api/info`).json<{title: string}>();

      console.log($page);


      const newNoti: ISimpleNoti = {
        content: notify.type === 'comment' ? `${n}님이 댓글을 달았습니다.` : '추천 수가 갱신 되었습니다',
        goto: `/community/${notify.root}/${notify.target}`,
        key,
        title,
        createdAt: new Date,
      }

      stored = [...stored, newNoti];

      // stored = [...stored, {...notify, createdAt: new Date}];
      setTimeout(() => {
        stored = stored.filter((noti) => noti.key !== key);
      }, 10000);
    }
  });

  interface ISimpleNoti {
    key: string;
    goto: string;
    title: string;
    content: string;
    createdAt: Date;
  }
</script>

<div class="pt-1 h-0 sticky top-14 right-2 float-right z-[12]">
  <div class="mt-2 mr-2 space-y-2 flex flex-col relative">
    <div class="absolute scale-95 top-0">
      <div class="absolute scale-95 -top-1.5">
        <Notification isDummy="{true}" />
      </div>
      <Notification isDummy="{true}" />
    </div>

    <Notification key="test"
                  title="새 알람이 있습니다"
                  content="ellipsi2님이 댓글을 달았습니다." on:goto={gotoNoti} />
  </div>
</div>