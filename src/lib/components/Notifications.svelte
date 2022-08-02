<script lang="ts">
  import {notifications} from '$lib/notifications/client';
  import Notification from './Notification.svelte';
  import {goto} from '$app/navigation';
  import {onMount} from 'svelte';
  import type {IPublicNotify} from '$lib/types/notify';

  let remaining: IPublicNotify[] = [];
  let recentNotification: IPublicNotify;

  function gotoNoti(event: CustomEvent<string>) {
  }

  function closeRecent() {
    const n = [...remaining];
    recentNotification = n.pop();
    remaining = n;
  }

  function closeAll() {
    remaining = [];
    recentNotification = undefined;
  }

  onMount(() => {
    notifications.subscribe(async (notify) => {
      if (notify) {
        remaining = [...remaining, recentNotification];
        recentNotification = notify;
      }
    });
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
    {#if remaining.length > 2}
      <div class="absolute scale-95 top-0">
        {#if remaining.length > 3}
          <div class="absolute scale-95 -top-1.5">
            <Notification isDummy="{true}" />
          </div>
        {/if}
        <Notification isDummy="{true}" />
      </div>
    {/if}

    {#if recentNotification}
      <Notification notification="{recentNotification}"
                    on:close={closeRecent}
                    on:closeall={closeAll}
                    on:goto={gotoNoti} />
    {/if}
  </div>
</div>