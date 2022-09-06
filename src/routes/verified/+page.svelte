<script lang="ts">
  import {onMount} from 'svelte';
  import {client} from '$lib/auth/user/client';

  import type {PageData} from './$types';

  export let data: PageData;

  let succeed = data.succeed;
  let adult = data.adult;

  onMount(() => {
    if (succeed) {
      client.update((oldSession) => {
        if (oldSession.user) {
          oldSession.user.adult = adult;
        }
        return oldSession;
      });
    }

    if (adult) {
      client.update((oldSession) => {
        if (oldSession.user) {
          oldSession.user.adult = adult;
        }
        return oldSession;
      });
    }
  });
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

