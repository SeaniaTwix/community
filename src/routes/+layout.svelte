<script lang="ts">
  import 'material-icons/iconfont/material-icons.css';
  import '../styles/tailwind.css';
  import '../styles/global.css';
  import Nav from '$lib/components/Nav.svelte';
  import {onDestroy, onMount} from 'svelte';
  import {CookieParser} from '$lib/cookie-parser';
  import {page} from '$app/stores';
  import {iosStatusBarColor} from '$lib/stores/shared/theme';
  import Notifications from '$lib/components/Notifications.svelte';
  import ky from 'ky-universal';
  import {NotificationsClient, unread} from '$lib/notifications/client';
  import Cookies from 'js-cookie';
  import type {PageData} from '$lib/types/$types';
  import {client} from '$lib/auth/user/client';
  import {afterNavigate} from '$app/navigation';
  import type {AllowedExtensions} from '@root/app';

  export let data: PageData;

  // console.log('+layout:', data);

  function getImageOrder(imageOrder?: string): AllowedExtensions[] {
    return ((imageOrder ?? 'jxl,avif,webp,png').split(',') as AllowedExtensions[] || undefined) ?? ['jxl', 'avif', 'webp', 'png'];
  }

  afterNavigate(() => {
    // const cookies = CookieParser.parse(document.cookie);
    client.update((prev) => {
      return {
        user: prev.user ?? data.user,
        settings: {
          imageOrder: getImageOrder(Cookies.get('image_order')),
        },
        ui: {
          commentFolding: Cookies.get('comment_folding') === 'true',
          buttonAlign: Cookies.get('button_align') !== 'left' ? 'right' : 'left',
          listType: Cookies.get('list_type') !== 'gallery' ? 'list' : 'gallery',
        },
      };
    });
  });

  onMount(() => {
    const cookies = (new CookieParser(document.cookie)).get();
    // noinspection TypeScriptUnresolvedVariable
    if (cookies?.theme === 'dark') {
      const html = document.querySelector('html');
      html.classList.add('dark');
    }

    const user = $client?.user ?? data?.user;

    if (user) {
      NotificationsClient.init(user.uid);
    }

    iosStatusBarColor.subscribe((color) => {
      const themeColorElement: HTMLMetaElement = document.querySelector('meta[name="theme-color"]');
      themeColorElement.setAttribute('content', color);
    });

  });

  page.subscribe(async () => {
    const user = $client?.user ?? data?.user;

    if (user) {
      try {
        const {unread: u} = await ky.get('/notifications/api/unread?exists').json<{ unread: boolean }>();
        unread.set(u ?? false);
        // console.log('set:', u);
      } catch {
        unread.set(false);
      }

      const now = Date.now();
      const expiredAt = $client.user?.exp * 1000;
      if (isNaN(now - expiredAt)) {
        return;
      }
      if (now - expiredAt > 0) {
        ky.get('/user/profile/api/my').json<any>()
          .then(({user}) => {
            $client.user = user;
          })
          .catch(() => {
            $client.user = undefined;
          });
      }
    }
  });

  //export let boards: string[] = [];
  // console.log(uid)
</script>
<Nav {data}/>
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