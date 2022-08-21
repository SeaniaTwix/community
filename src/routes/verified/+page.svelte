<script lang="ts" context="module">
  throw new Error("@migration task: Check code was safely removed (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292722)");


  // import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  // import HttpStatus from 'http-status-codes';

  // export async function load({session: {user}, url}: LoadEvent): Promise<LoadOutput> {
  //   if (!user) {
  //     return {
  //       status: HttpStatus.MOVED_TEMPORARILY,
  //       redirect: `/login`
  //     };
  //   }

  //   const succeed = url.searchParams.get('result') === 'succeed';
  //   const res = await fetch(url.origin + '/user/profile/api/my');
  //   const {user: userData} = await res.json();
  //   return {
  //     props: {
  //       adult: userData?.adult === true,
  //       succeed,
  //     },
  //   };
  // }
</script>
<script lang="ts">
  throw new Error("@migration task: Add data prop (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292707)");

  import {session} from '$app/stores';
  import {onMount} from 'svelte';

  export let succeed: boolean;
  export let adult: boolean;

  onMount(() => {
    if (succeed) {
      session.update((oldSession) => {
        oldSession.user.adult = adult;
        return oldSession;
      });
    }

    if (adult) {
      session.update((oldSession) => {
        oldSession.user.adult = adult;
        return oldSession;
      });
    }

  })
</script>
{#if adult}
  성공!
{:else}
  {#if succeed}
    성공!
  {:else}
    실패...
  {/if}
{/if}

