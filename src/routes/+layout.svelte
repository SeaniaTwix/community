<script lang="ts">
  import 'material-icons/iconfont/material-icons.css';
  import '../styles/tailwind.css';
  import '../styles/global.css';
  import Nav from '$lib/components/Nav.svelte';
  import {classList} from 'svelte-body';
  import {onMount} from 'svelte';
  import {CookieParser} from '$lib/cookie-parser';
  import {page} from '$app/stores';
  import {iosStatusBarColor} from '$lib/stores/shared/theme';
  import Notifications from '$lib/components/Notifications.svelte';
  import ky from 'ky-universal';
  import {NotificationsClient, unread} from '$lib/notifications/client';

  import type {PageData} from './$types';
  import {client} from '$lib/auth/user/client';
  import {afterNavigate} from '$app/navigation';
  import type {AllowedExtensions} from '@root/app';

  export let data: PageData;

  // console.log('+layout:', data);

  function getImageOrder(cookies: Record<string, string>): AllowedExtensions[] {
    const {image_order} = cookies;
    return ((<string>image_order)?.split(',') as AllowedExtensions[] || undefined) ?? ['jxl', 'avif', 'webp', 'png'];
  }

  afterNavigate(() => {
    const cookies = CookieParser.parse(document.cookie);
    client.update((prev) => {
      return {
        user: prev.user ?? data.user,
        settings: {
          imageOrder: getImageOrder(cookies),
        },
        ui: {
          commentFolding: cookies?.comment_folding === 'true',
          buttonAlign: cookies?.button_align !== 'left' ? 'right' : 'left',
          listType: cookies?.list_type !== 'gallery' ? 'list' : 'gallery',
        },
      };
    });
    // console.log(data, $client);
  });

  onMount(() => {
    const cookies = (new CookieParser(document.cookie)).get();
    // noinspection TypeScriptUnresolvedVariable
    if (cookies?.theme === 'dark') {
      const html = document.querySelector('html');
      html.classList.add('dark');
    }

    if (data?.user) {
      NotificationsClient.init(data.user.uid);
    }

  });

  page.subscribe(async () => {
    if (data?.user) {
      try {
        const {unread: u} = await ky.get('/notifications/api/unread?exists').json<{ unread: boolean }>();
        unread.set(u ?? false);
        // console.log('set:', u);
      } catch {
        unread.set(false);
      }

      const now = Date.now();
      const expiredAt = data.user.exp * 1000;
      if (isNaN(now - expiredAt)) {
        return;
      }
      if (now - expiredAt > 0) {
        ky.get('/user/profile/api/my').json()
          .then(({user}) => {
            data.user = user;
          })
          .catch(() => {
            data.user = undefined;
          });
      }
    }
  });

  //export let boards: string[] = [];
  // console.log(uid)
</script>
<svelte:head>
  <meta name="theme-color" content="{$iosStatusBarColor}"/>
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
</svelte:head>
<svelte:body use:classList={'dark:bg-gray-600 dark:text-zinc-200 transition-colors'}/>

<Nav {data}/>
<Notifications/>
<main>
  {JSON.stringify($client)}
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