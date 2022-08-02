<script lang="ts">
  import Login from '$lib/components/Login.svelte';
  import ky from 'ky-universal';
  import {goto} from '$app/navigation';
  import {session} from '$app/stores';
  import {decode} from 'js-base64';
  import {NotificationsClient} from '$lib/notifications/client';

  let whenFailed: () => void;

  type LoginDetail = { id: string, password: string, whenDone: () => void };

  function decodeToken(token: string) {
    try {
      // console.log(JSON.parse(decode(token.split('.')[1])))
      return JSON.parse(decode(token.split('.')[1]));
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async function login(event: CustomEvent<LoginDetail>) {
    const {id, password} = event.detail;
    await ky.post('/user/login', {
      json: {id, password},
    }).then(async (result) => {
      const {token} = await result.json<{ token: string }>();

      session.update((store) => {
        // console.log('update');
        return {
          ...store,
          user: decodeToken(token),
        };
      });

      NotificationsClient.init($session.user.uid);

      goto(sessionStorage.getItem('ru.hn:back') ?? '/').then(() => {
        sessionStorage.removeItem('ru.hn:back');
      });
    }).catch((e) => {
      // show error message
      console.error(e);
      whenFailed();
    });

    event.detail.whenDone();
  }
</script>

<svelte:head>
  <title>루헨 - 로그인</title>
</svelte:head>

<div class="mt-24 w-10/12 md:w-3/5 lg:w-1/3 mx-auto">
  <Login on:login={login} bind:whenFailed={whenFailed}/>
</div>
