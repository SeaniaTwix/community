<script lang="ts" context="module">
  throw new Error("@migration task: Check code was safely removed (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292722)");

  // import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  // import type {BoardItemDto} from '$lib/types/dto/board-item.dto';
  // import HttpStatus from 'http-status-codes';

  // export async function load({url, fetch, session}: LoadEvent): Promise<LoadOutput> {
  //   try {
  //     const response = await fetch(`${url.origin}/community/api/all`);
  //     const {boards} = await response.json<{ boards: BoardItemDto[] }>();

  //     if (session.user) {
  //       const notiRes = await fetch('/notifications/api/unread');
  //       const {unread} = await notiRes.json();
  //     }

  //     /*
  //     let user: IUser;

  //     try {
  //       if (uid) {
  //         const ur = await fetch(`/user/profile/api/detail?id=${uid}`);
  //         const result = await ur.json<{ user: IUser }>();
  //         user = result.user;

  //       }
  //     } catch {
  //       // user not found;
  //     } */

  //     return {
  //       status: 200,
  //       props: {
  //         boards,
  //       },
  //     };
  //   } catch (e) {
  //     return {
  //       status: HttpStatus.BAD_GATEWAY,
  //       error: e.toString(),
  //     };
  //   }

  // }
</script>
<script lang="ts">
  throw new Error("@migration task: Add data prop (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292707)");

  import 'material-icons/iconfont/material-icons.css';
  import '../styles/tailwind.css';
  import '../styles/global.css';
  import Nav from '$lib/components/Nav.svelte';
  import {classList} from 'svelte-body';
  import {onMount} from 'svelte'
  import {CookieParser} from '$lib/cookie-parser';
  import {page} from '$app/stores';
  import {iosStatusBarColor} from '$lib/stores/shared/theme';
  import Notifications from '$lib/components/Notifications.svelte';
  import {session} from '$app/stores';
  import ky from 'ky-universal';
  import {NotificationsClient, unread} from '$lib/notifications/client';

  onMount(() => {
    const cookies = (new CookieParser(document.cookie)).get();
    // noinspection TypeScriptUnresolvedVariable
    if (cookies?.theme === 'dark') {
      const html = document.querySelector('html');
      html.classList.add('dark');
    }

    if ($session.user) {
      NotificationsClient.init($session.user.uid);
    }

  });

  page.subscribe(async () => {
    if ($session.user) {
      try {
        const {unread: u} = await ky.get('/notifications/api/unread?exists').json<{unread: boolean}>();
        unread.set(u ?? false);
        // console.log('set:', u);
      } catch {
        unread.set(false);
      }

      const now = Date.now();
      const expiredAt = $session.user.exp * 1000;
      if (isNaN(now - expiredAt)) {
        return;
      }
      if (now - expiredAt > 0) {
        ky.get('/user/profile/api/my').json()
          .then(({user}) => {
            $session.user = user;
          })
          .catch(() => {
            $session.user = undefined;
          })
      }
    }
  })

  export let boards: string[] = [];
  // console.log(uid)
</script>
<svelte:head>
  <meta name="theme-color" content="{$iosStatusBarColor}"/>
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
</svelte:head>
<svelte:body use:classList={'dark:bg-gray-600 dark:text-zinc-200 transition-colors'}/>

<Nav {boards}/>
<Notifications/>
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