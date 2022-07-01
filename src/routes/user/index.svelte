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
      .then(() => session.update(() => undefined));
  }
</script>

<div class="w-10/12 md:w-3/5 lg:w-1/3 mx-auto">
  <button on:click={logout}
          class="w-full bg-zinc-100 hover:bg-zinc-200 transition-colors py-2">
    로그아웃
  </button>
</div>