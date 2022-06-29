<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import {ELoginError} from '$lib/errors/login';
  import {goto} from '$app/navigation';

  const dispatch = createEventDispatcher();
  let password: HTMLInputElement;
  let id = '', pw = '';

  let error: ELoginError = ELoginError.None;

  function login() {
    if (pw.length <= 5) {
      error = ELoginError.PW_TOO_SHORT;
      return;
    }

    dispatch('login', {id, pw})
    // console.log('fired')
  }

  function checkEnter(event: KeyboardEvent, type: 0 | 1) {
    if (event.key === 'Enter') {
      if (type === 0) {
        if (id.length <= 2) {
          error = ELoginError.ID_TOO_SHORT;
          return;
        }
        return password.focus();
      }

      if (type === 1) {
        return login();
      }

      throw Error('Not handled: login');
    }
  }

</script>

<form on:submit|preventDefault class="space-y-4 text-lg">
  <input type="text" placeholder="ID" on:keydown={(e) => checkEnter(e, 0)}
         bind:value={id}
         class="w-full shadow-md rounded-md px-4 py-2 focus:outline-0">
  <input type="password" placeholder="PW" on:keydown={(e) => checkEnter(e, 1)}
         bind:this={password} bind:value={pw}
         class="w-full shadow-md rounded-md px-4 py-2 focus:outline-0">
  <div>
    <button on:click={login}
            class="bg-sky-400 text-white items-center rounded-md px-4 py-2">
      로그인
    </button>
    <button on:click={() => goto('/join').then()}
            class="bg-red-400 text-white items-center rounded-md px-4 py-2">
      회원가입
    </button>
  </div>
</form>