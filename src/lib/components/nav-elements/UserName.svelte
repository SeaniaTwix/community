<script lang="ts">
  import type {IUserSession} from '@root/app';
  import {unread} from '$lib/notifications/client';
  import NewNoti from 'svelte-material-icons/Circle.svelte';

  export let user: IUserSession;
</script>

<span class="relative">
  <a data-sveltekit-prefetch aria-label="내 프로필" href="/user"
     class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md transition-colors mt-0.5
          dark:hover:bg-gray-500 truncate max-w-[16rem] sm:max-w-[24rem] md:max-w-[32rem] lg:max-w-full">
    {user?.sub?.split('/')?.[1] ?? '알 수 없음'}
  </a>
  {#if $unread === true}
    <span class="absolute mt-1 right-1 text-xs text-red-400">
      <NewNoti/>
    </span>
  {/if}
</span>