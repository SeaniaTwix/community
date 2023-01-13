<script lang="ts">
  import Login from '$lib/components/Login.svelte';
  import {goto} from '$app/navigation';
  import {NotificationsClient} from '$lib/notifications/client';
  import {client, decodeToken} from '$lib/auth/user/client';
  import {page} from '$app/stores';
  import {onDestroy} from 'svelte';
  import {browser} from '$app/environment';

  if (browser) {
    onDestroy(
      page.subscribe(({form}) => {
        const token = form?.token;

        if (token) {
          const user = decodeToken(token);

          if (user) {
            $client.user = user;

            NotificationsClient.init(user.uid);

            goto(sessionStorage.getItem('ru.hn:back') ?? '/').then(() => {
              sessionStorage.removeItem('ru.hn:back');
            });
          }
        }
      })
    );
  }

</script>

<svelte:head>
  <title>루헨 - 로그인</title>
</svelte:head>

<div class="mt-24 w-10/12 md:w-3/5 lg:w-1/3 mx-auto">
  <Login />
</div>
