<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import {ELoginError} from '$lib/errors/login';
  import {goto} from '$app/navigation';
  import Pulse from 'svelte-loading-spinners/dist/Pulse.svelte'

  const dispatch = createEventDispatcher();
  let passwordInput: HTMLInputElement;
  let loginButton: HTMLButtonElement;
  let id = '', password = '';
  let loading = false;

  let error: ELoginError = ELoginError.None;

  function done() {
    loading = false;
    loginButton.disabled = false;
  }

  function login() {
    if (loading) {
      return;
    }

    if (password.length <= 5) {
      error = ELoginError.PW_TOO_SHORT;
      return;
    }

    loginButton.disabled = true;

    dispatch('login', {id, password, whenDone: done});
    // console.log('fired')
  }

  function checkEnter(event: KeyboardEvent, type: 0 | 1) {
    if (event.key === 'Enter') {
      if (type === 0) {
        if (id.length <= 2) {
          error = ELoginError.ID_TOO_SHORT;
          return;
        }
        return passwordInput.focus();
      }

      if (type === 1) {
        return login();
      }

      throw Error('Not handled: login');
    }
  }

  let animating: number = null;
  export function whenFailed() {
    if (animating) {
      clearTimeout(animating);
    }
    loginButton.classList.add('__failed');
    animating = setTimeout(() => {
      loginButton.classList.remove('__failed');
      animating = null;
    }, 800);
  }

</script>

<form on:submit|preventDefault class="space-y-4 font-medium">
  <div class="__auto-fill shadow-md rounded-md px-4 py-2 bg-zinc-50 dark:bg-gray-500">
    <input type="text" placeholder="ID" on:keydown={(e) => checkEnter(e, 0)}
           bind:value={id} autocorrect="off" autocapitalize="none"
           class="w-full bg-transparent focus:outline-0 rounded-md">
  </div>
  <div class="shadow-md rounded-md px-4 py-2 bg-zinc-50 dark:bg-gray-500">
    <input type="password" placeholder="PW" on:keydown={(e) => checkEnter(e, 1)}
           bind:this={passwordInput} bind:value={password}
           class="w-full bg-transparent focus:outline-0 rounded-md">
  </div>
  <div class="flex space-x-2">
    <button on:click={login} id="btn-login" bind:this={loginButton}
            class="bg-sky-400 hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white items-center rounded-md px-4 py-2
                    flex-grow disabled:bg-sky-600 disabled:text-zinc-500 transition-colors">
      {#if !loading}
        로그인
      {:else}
        <Pulse size="1.25" unit="rem" color="white" />
      {/if}
    </button>
    <button on:click={() => goto('/join').then()}
            class="bg-red-400 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-500 transition-colors text-white items-center rounded-md px-4 py-2">
      계정이 없어요
    </button>
  </div>

  <div class="space-y-2">
    <div>
      <button type="button"
              class="text-white bg-[#3b5998] hover:bg-[#3b5998]/90 focus:ring-4
           focus:outline-none focus:ring-[#3b5998]/50 font-medium rounded-lg
            text-sm px-5 py-2.5 text-center inline-flex items-center
             dark:focus:ring-[#3b5998]/55">
        <svg class="w-4 h-4 mr-2 -ml-1" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="facebook-f"
             role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
          <path fill="currentColor"
                d="M279.1 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.4 0 225.4 0c-73.22 0-121.1 44.38-121.1 124.7v70.62H22.89V288h81.39v224h100.2V288z"></path>
        </svg>
        페이스북으로 간편 가입
      </button>
    </div>
    <div class="m-0">
      <button type="button"
              class="text-white bg-[#4285F4] hover:bg-[#4285F4]/90 focus:ring-4
           focus:outline-none focus:ring-[#4285F4]/50 font-medium rounded-lg
            text-sm px-5 py-2.5 text-center inline-flex items-center
             dark:focus:ring-[#4285F4]/55">
        <svg class="w-4 h-4 mr-2 -ml-1" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img"
             xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
          <path fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
        </svg>
        구글로 간편 가입
      </button>
    </div>
    <div class="mt-0">
      <button type="button"
              class="text-white bg-[#050708] hover:bg-[#050708]/90 focus:ring-4
           focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg
            text-sm px-5 py-2.5 text-center inline-flex items-center mx-auto
             dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30">
        <svg class="w-5 h-5 mr-2 -ml-1" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="apple" role="img"
             xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
          <path fill="currentColor"
                d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"></path>
        </svg>
        애플로 간편 가입
      </button>
    </div>
  </div>
</form>

<style lang="scss">
  :global {
    #btn-login {
      div {
        display: inline !important;
        top: -2px;
        // height: 1.25rem;
        // min-height: 38px;
      }
    }


    .__failed {
      animation: shake 0.8s cubic-bezier(.36,.07,.19,.97) both;
      transform: translate3d(0, 0, 0);
      backface-visibility: hidden;
      perspective: 1000px;
    }

    @keyframes shake {
      10%, 90% {
        transform: translate3d(-1px, 0, 0);
      }

      20%, 80% {
        transform: translate3d(2px, 0, 0);
      }

      30%, 50%, 70% {
        transform: translate3d(-4px, 0, 0);
      }

      40%, 60% {
        transform: translate3d(4px, 0, 0);
      }
    }
  }

</style>