<script lang="ts">
    import type { PageData } from './$types';
    import {page} from '$app/stores';
    
    export let data: PageData;

    function approve() {
      console.log('approve')
      fetch(data.external!.callback, {
        method: 'POST',
        body: JSON.stringify({
          token: data.external?.token,
        }),
      }).catch(() => {
        // window.location.href = data.external?.fallback ?? window.location.href;
      }).then(async (res) => {
        if (res instanceof Response) {
          const {token, redir} = await res.json();
          const url = new URL(redir);
          url.searchParams.set('token', token);
          window.location.href = url.toString();
        } else {
          throw Error('unhandled error');
        }
        // window.location.href = data.external?.callback ?? window.location.href;
      });
    }
</script>


<div class="w-full h-full bg-transparent flex flex-row items-center">
  <p class="w-32">
    {JSON.stringify(data.external)}
  </p>
  <div class="w-1/2 p-4 gap-4 mx-auto rounded-lg flex flex-row">
    {#if data?.error}
      {#if data.error === 'expired'}
        <div class="flex flex-col gap-2 w-full">
          <h1 class="text-2xl">토큰이 만료되었습니다.</h1>
          <p>원래의 페이지로 돌아가 토큰을 재발급 받아야 합니다.</p>
          <a href="/" class="py-2 text-center bg-sky-400 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 rounded-md shadow-md  w-full">요청 페이지로 돌아가기</a>
        </div>
      {:else}
        <p>알 수 없는 에러... 관리자에게 문의하세요. ({data.error})</p>
      {/if}
    {:else}
    <button on:click={approve} class="inline-block w-60 mx-auto bg-rose-300 hover:bg-rose-400 text-white rounded-md shadow-md p-8 transition-colors relative">
      로그인 승인
    </button>
    {/if}
  </div>
</div>

