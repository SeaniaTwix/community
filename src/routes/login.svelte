<script lang="ts">
  import Login from '$lib/components/Login.svelte';
  import ky from 'ky-universal';
  import {goto} from '$app/navigation';
  import {getStores} from '$app/stores';
  const {session} = getStores();
  import Close from 'svelte-material-icons/Close.svelte';

  type LoginDetail = {id: string, password: string, whenDone: () => void};

  async function login(event: CustomEvent<LoginDetail>) {
    const {id, password} = event.detail;
    await ky.post('/user/login', {
      json: {id, password},
    }).then(async (result) => {
      const {token} = await result.json<{token: string}>();

      session.update((store) => ({
        ...store,
        ...JSON.parse(atob(token.split('.')[1])),
      }));
      goto(localStorage.getItem('now.gd:back') ?? '/').then(() => {
        localStorage.removeItem('now.gd:back');
      })
    }).catch(() => {
      // show error message
    })

    console.log('done');
    event.detail.whenDone();
  }
</script>

<div class="mt-24 w-1/3 mx-auto">
  <Login on:login={login} />
</div>