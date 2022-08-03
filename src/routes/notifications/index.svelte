<script lang="ts" context="module">

  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import HttpStatus from 'http-status-codes';

  export async function load({session, fetch}: LoadEvent): Promise<LoadOutput> {
    if (!session.user) {
      return {
        status: HttpStatus.MOVED_TEMPORARILY,
        redirect: '/login',
      };
    }

    const res = await fetch('/notifications/api/list');
    const {list} = await res.json();
    return {
      status: HttpStatus.OK,
      props: {
        list,
      },
    };
  }
</script>
<script lang="ts">
  import type {IPublicNotify} from '$lib/types/notify';

  export let list: IPublicNotify[];

  function content(notify: IPublicNotify) {
    if (notify.type === 'comment') {
      return `<strong>${notify.content}</strong> 게시글에 댓글이 달렸습니다.`;
    } else if (notify.type === 'reply') {
      return `<strong>${notify.content}</strong> 게시글에 작성한 댓글에 답글이 달렸습니다.`;
    } else if (notify.type === 'vote') {
      return `<strong>${notify.content}</strong> 게시글이 추천 수를 갱신했습니다.`;
    } else {
      return `<strong>${notify.content}</strong> 게시글에 정의되지 않은 알림이 발생했습니다.`;
    }
  }

  function href(notify: IPublicNotify) {
    if (notify.type === 'comment' || notify.type === 'reply') {
      return `/community/${notify.root}#c${notify.value}`;
    }
    return `/community/${notify.root}`;
  }
</script>

<div class="w-11/12 md:w-3/5 lg:w-7/12 xl:w-1/2 2xl:w-1/3 mx-auto space-y-4 mt-4">
  <div class="flex flex-row justify-between">
    <h1 class="text-lg">
      알림
    </h1>
    <a class="cursor-pointer select-none" href="/user">
      <div class="inline-block bg-zinc-100 dark:bg-gray-500 rounded-md shadow-md px-4 py-2 transition-colors">
        내 사용자 페이지로
      </div>
    </a>
  </div>
  <ol class="space-y-2">
    {#each list as notify}
      <li>
        <a href="{href(notify)}">
          <div class="px-4 py-3 bg-zinc-100 dark:bg-gray-500 rounded-md shadow-md transition-colors"
               class:text-zinc-400={!notify.unread}>
            <p class="__notify-content">{@html content(notify)}</p>
          </div>
        </a>
      </li>
    {/each}
  </ol>
</div>

