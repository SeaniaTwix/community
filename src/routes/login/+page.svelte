<script lang="ts">
  import Login from '$lib/components/Login.svelte';
  import {goto} from '$app/navigation';
  import {NotificationsClient} from '$lib/notifications/client';
  import {User} from '$lib/auth/user/client';

  let whenFailed: () => void;

  type LoginDetail = { id: string, password: string, whenDone: () => void };

  async function login(event: CustomEvent<LoginDetail>) {
    const {id, password} = event.detail;
    const user = new User(id);
    user.login(password)
      .then(async (user) => {
        NotificationsClient.init(user.uid);

        goto(sessionStorage.getItem('ru.hn:back') ?? '/').then(() => {
          sessionStorage.removeItem('ru.hn:back');
        });
      })
      .catch((e) => {
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
