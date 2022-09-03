<script lang="ts">
  import {page} from '$app/stores';

  export let title: string;
  export let errors: Record<string, boolean>
  export let session;

  function saveLink() {
    sessionStorage.setItem('ru.hn:back', location.pathname);
  }
</script>

<div class="w-1/2 mx-auto space-y-4">
  <h1 class="text-3xl">해당 페이지를 열람할 수 없습니다.</h1>

  <div class="flex flex-row">
    {#if errors?.isNoAdult === true}
      {#if !session.user}
        <a class="text-sky-500 hover:underline decoration-sky-400" href="/login" on:click={saveLink}>
          로그인
        </a>
        이후
      {/if}
      <p class="flex flex-row">
        {#if !session.user}
          성인인증
        {:else}
          <a class="text-rose-500 hover:underline decoration-rose-400" href="/user/settings/adult">
            성인인증
          </a>
        {/if}
        이 필요합니다
      </p>
    {:else if errors?.isNotFound === true}
      <p>해당 게시글이 존재하지 않습니다...</p>
    {:else}
      <p>이유를 알 수 없습니다. 관리자에게 문의하세요. dev@ez.is</p>
      <p>{$page.error.message}</p>

    {/if}
  </div>

  <div class="w-full">
    <a class="block text-center px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-gray-500 dark:hover:bg-gray-400 w-full rounded-md shadow-md transition-colors"
       href="/community/{$page.params.id}{$page.url.search}">
      돌아가기
    </a>
  </div>
</div>