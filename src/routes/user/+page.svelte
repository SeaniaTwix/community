<script lang="ts">
  import ky from 'ky-universal';
  import {goto} from '$app/navigation';
  import {session} from '$app/stores';

  /**
   * 내 정보 보기
   */

  function logout() {
    ky.post('/user/logout')
      .then(() => goto('/'))
      .then(() => session.update((s) => {
        delete s.user;
        return s;
      }));
  }

</script>

<svelte:head>
  <title>루헨 - 내 프로필</title>
</svelte:head>

<div class="w-10/12 md:w-3/5 lg:w-1/3 mx-auto space-y-4">
  <a data-sveltekit-prefetch
     class="w-full block bg-zinc-100 rounded-md hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 text-center shadow-md"
     href="/user/profile/edit">
    내 프로필 수정
  </a>
  {#if !$session.user.adult}
    <a data-sveltekit-prefetch
       class="w-full block bg-zinc-100 rounded-md hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 text-center shadow-md flex flex-row justify-center space-x-2 items-center hover:ring-2 ring-red-400 ring-offset-2 dark:ring-offset-gray-600"
       href="/user/settings/adult">
    <span class="inline-block w-4">
      <svg class="fill-[#0071bc] dark:fill-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.14 30.46">
        <path d="M0,30.46V0H9.15A17.22,17.22,0,0,1,13,.39a8.32,8.32,0,0,1,3,1.27A5.86,5.86,0,0,1,18,4.1a9.08,9.08,0,0,1,.7,3.78,8.36,8.36,0,0,1-.82,3.77,6,6,0,0,1-2.59,2.64v.09a11.31,11.31,0,0,1,2,1.42,5.69,5.69,0,0,1,1.16,1.48A5.83,5.83,0,0,1,19,19.13a16.53,16.53,0,0,1,.16,2.51q0,4.51-2.37,6.66c-1.57,1.44-3.85,2.16-6.82,2.16ZM7.06,12c.14,0,.35,0,.65,0a6.41,6.41,0,0,0,3.09-.69c.53-.38.8-1.34.8-2.89,0-1.27-.34-2.07-1-2.39a8.8,8.8,0,0,0-3.51-.49Zm0,13h.65c1,0,1.71-.06,2.16-.12a2.5,2.5,0,0,0,1.21-.45,2.09,2.09,0,0,0,.76-1.15A8,8,0,0,0,12.08,21a4.79,4.79,0,0,0-.32-1.92,2.32,2.32,0,0,0-.9-1.06,3.59,3.59,0,0,0-1.35-.45c-.51-.06-1.19-.11-2-.14h-.4Z"/>
      </svg>
    </span>
      <span>비바톤으로 성인인증 (본인인증)</span>
    </a>
  {/if}
  <a data-sveltekit-prefetch
     class="w-full block bg-zinc-100 rounded-md hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 text-center shadow-md"
     href="/user/settings">
    개인화 설정
  </a>
  <a data-sveltekit-prefetch
     class="w-full block bg-zinc-100 rounded-md hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 text-center shadow-md"
     href="/notifications">
    알림 목록
  </a>
  <button on:click={logout}
          class="w-full bg-zinc-100 rounded-md hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 shadow-md">
    로그아웃
  </button>
</div>