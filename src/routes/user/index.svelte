<script lang="ts" context="module">
  // todo: check session
</script>
<script lang="ts">
  import ky from 'ky-universal';
  import {goto} from '$app/navigation';
  import {getStores} from '$app/stores';

  /**
   * 내 정보 보기
   */

  const {session} = getStores();

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
  <a sveltekit:prefetch
     class="w-full block bg-zinc-100 rounded-md hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 text-center shadow-md"
     href="/user/profile/edit">
    내 프로필 수정
  </a>
  <button on:click={logout}
          class="w-full bg-zinc-100 rounded-md hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 shadow-md">
    로그아웃
  </button>
</div>