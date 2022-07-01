<script lang="ts" context="module">

  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import type {BoardItemDto} from '$lib/types/dto/board-item.dto';
  import ky from 'ky-universal';

  export async function load({session, stuff, url, fetch}: LoadEvent): Promise<LoadOutput> {
    const response = await fetch(`${url.origin}/community/api/all`);
    const {boards} = await response.json<{boards: BoardItemDto[]}>();

    console.log(session)

    return {
      status: 200,
      props: {
        uid: session?.uid,
        boards,
      }
    }
  }
</script>
<script lang="ts">
  import 'material-icons/iconfont/material-icons.css';
  import '../styles/tailwind.css';
  import Nav from '$lib/components/Nav.svelte';
  import { classList } from 'svelte-body';

  export let uid;
  export let boards: string[] = [];
  console.log(uid)
</script>

<svelte:body use:classList={'dark:bg-gray-600 dark:text-zinc-200 transition-colors'} />

<Nav {boards} {uid}/>
<slot/>

<style lang="scss">
  :global {

    svg {
      display: inline-block;
      vertical-align: sub;
    }
  }
</style>