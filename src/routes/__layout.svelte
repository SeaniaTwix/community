<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import type {BoardItemDto} from '$lib/types/dto/board-item.dto';
  import type {IUser} from '$lib/types/user';
  import HttpStatus from 'http-status-codes';

  export async function load({session, url, fetch}: LoadEvent): Promise<LoadOutput> {
    try {
      const response = await fetch(`${url.origin}/community/api/all`);
      const {boards} = await response.json<{boards: BoardItemDto[]}>();

      let user: IUser;

      try {
        if (session) {
          const ur = await fetch(`/user/profile/api/detail?id=${session.uid}`);
          const result = await ur.json<{ user: IUser }>();
          user = result.user;

        }
      } catch {
        // user not found;
      }

      return {
        status: 200,
        props: {
          uid: session?.uid,
          boards,
          user,
        }
      }
    } catch (e) {
      return {
        status: HttpStatus.BAD_GATEWAY,
        error: e.toString(),
      }
    }

  }
</script>
<script lang="ts">
  import 'material-icons/iconfont/material-icons.css';
  import '../styles/tailwind.css';
  import '../styles/global.css';
  import Nav from '$lib/components/Nav.svelte';
  import { classList } from 'svelte-body';
  import {onMount} from 'svelte';
  import {CookieParser} from '$lib/cookie-parser';

  onMount(() => {
    const cookies = (new CookieParser(document.cookie)).get();
    if (cookies?.theme === 'dark') {
      const html = document.querySelector('html');
      html.classList.add('dark');
    }
  })

  export let uid;
  export let boards: string[] = [];
  export let user: IUser;
  // console.log(uid)
</script>

<svelte:body use:classList={'dark:bg-gray-600 dark:text-zinc-200 transition-colors'} />

<Nav {boards} {uid} {user} />
<main>
  <slot/>
</main>

<style lang="scss">
  :global {

    svg {
      display: inline-block;
      vertical-align: sub;
    }
  }
</style>