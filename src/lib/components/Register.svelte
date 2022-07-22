<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import {ELoginError} from '$lib/errors/login';
  import _ from 'lodash-es';

  const dispatch = createEventDispatcher();
  let password: HTMLInputElement, passwordRepeat: HTMLInputElement;
  let id = '', pw = '', pwr = '';

  let error: ELoginError = ELoginError.None;

  function register() {
    if (pw.length <= 5) {
      error = ELoginError.PW_TOO_SHORT;
      return;
    }

    dispatch('register', {id, pw})
    // console.log('fired')
  }

  let pwrError = false;

  function checkEnter(event: KeyboardEvent, type: 0 | 1 | 2) {
    if (event.key === 'Enter') {
      // console.log(type)
      if (type === 0) {
        if (id.length <= 2) {
          error = ELoginError.ID_TOO_SHORT;
          return;
        }
        return password.focus();
      }

      if (type === 1) {
        if (pw.length <= 5) {
          error = ELoginError.PW_TOO_SHORT;
          return;
        }
        return passwordRepeat.focus();
      }

      if (type === 2) {
        return register();
      }

      throw new Error('Not handled: register');
    }
  }

  function checkError(e: KeyboardEvent, type: 0 | 1 | 2) {
    if (type === 2) {
      pwrError = isErrorRepeat();
    }
  }

  function isNotEmpty(some: any) {
    return !_.isEmpty(some);
  }

  function isErrorRepeat() {
    return pw !== pwr && (isNotEmpty(pwr) || passwordRepeat === document.activeElement);
  }

</script>

<form on:submit|preventDefault class="space-y-4 text-lg">
  <input type="text" placeholder="계정 이름 겸 닉네임" on:keydown={(e) => checkEnter(e, 0)}
         bind:value={id} autocorrect="off" autocapitalize="none" autocomplete="off"
         class="w-full shadow-md rounded-md px-4 py-2 outline-none focus:outline-0">
  <input type="password" placeholder="비밀번호" on:keydown={(e) => checkEnter(e, 1)}
         bind:this={password} bind:value={pw} autocomplete="off"
         class="w-full shadow-md rounded-md px-4 py-2 {pwrError ? 'outline' : 'focus:outline-0'} outline-red-400">
  <input type="password" placeholder="비밀번호 재입력"
         on:keyup={(e) => checkError(e, 2)} on:keydown={(e) => checkEnter(e, 2)}
         bind:this={passwordRepeat} bind:value={pwr} autocomplete="off"
         class="w-full shadow-md rounded-md px-4 py-2 {pwrError ? 'outline' : 'focus:outline-0'} outline-red-400">
  <div>
    <button disabled="{pwrError || _.isEmpty(id) || _.isEmpty(pw) || _.isEmpty(pwr)}"
            class="bg-red-400 dark:bg-red-600 text-white items-center rounded-md px-4 py-2 disabled:bg-red-100 dark:disabled:bg-red-300" on:click={register}>
      회원가입
    </button>
  </div>
</form>