<script lang="ts">
  import Back from 'svelte-material-icons/ArrowLeftBold.svelte'
  import {page} from '$app/stores';
  import ky from 'ky-universal';
  import Checkbox from '$lib/components/Checkbox.svelte';

  let cacheResult: 'ok' | 'failed' | undefined;

  let minLikeForBest = 1;

  let adultOnly = false;

  function unpubAll() {

  }

  function truncateBoard() {

  }

  async function cacheAllSearch() {
    try {
      await ky.post('/community/api/cache-all')
      cacheResult = 'ok';
    } catch {
      cacheResult = 'failed';
    }
  }
</script>

<div class="w-4/6 sm:w-2/3 md:w-1/2 lg:w-1/3 mx-auto space-y-4">
  <div class="flex justify-end">
    <a href="/community/{$page.params.id}" class="px-4 py-2 rounded-md hover:bg-zinc-200 transition-colors">
      <Back />
    </a>
  </div>

  <a href="/community/{$page.params.id}/manage/list" on:click={truncateBoard} class="bg-zinc-100 dark:bg-gray-500 rounded-md w-full py-2 block text-center shadow-md">
    비공개 게시글 목록
  </a>

  <button on:click={truncateBoard} class="bg-amber-400 dark:bg-amber-600 rounded-md w-full py-2 block text-center shadow-md">
    이 게시판의 게시글 전부 비공개
  </button>
  <button on:click={truncateBoard} class="text-white bg-red-600 dark:bg-red-700 rounded-md w-full py-2 block text-center shadow-md">
    이 게시판의 게시글 전부 (영구적) 삭제
  </button>

  <button on:click={cacheAllSearch} class="text-white bg-sky-400 dark:bg-sky-700 rounded-md w-full py-2 block text-center shadow-md">
    {#if cacheResult === undefined}
      강제로 검색 엔진에 캐시
    {:else if cacheResult === 'ok'}
      캐시 성공
    {:else}
      캐시 실패
    {/if}
  </button>

  <div class="space-y-2">
    <div class="relative shadow-md rounded-md bg-zinc-50 dark:bg-gray-500 flex flex-col space-x-4">
      <span class="absolute  px-4 py-2 text-zinc-500 dark:text-zinc-300 flex-shrink-0 pointer-events-none">베스트 추천 조건</span>
      <div class="flex flex-row divide-x divide-zinc-200 dark:divide-gray-400/50">
        <input type="number" placeholder="1 이상의 값을 입력해주세요" min="1" max="9999"
               bind:value={minLikeForBest} autocorrect="off" autocapitalize="none"
               class="grow pl-32 pr-4 py-2 bg-transparent outline-none focus:outline-0 rounded-md">
        <button class="shrink-0 px-4 hover:bg-zinc-200 dark:bg-gray-500 rounded-r-md">적용</button>
      </div>
    </div>
    <div class="space-y-2">
      <h2>성인 게시글 [NOT WORKING]</h2>
      <Checkbox bind:checked={adultOnly}>성인 전용</Checkbox>
      {#if !adultOnly}
        <Checkbox>허용하지 않음</Checkbox>
        <Checkbox>성인 태그 된 게시글 비인증 사용자에게서 숨기기</Checkbox>
      {:else}
        <p class="text-sm">성인 전용 게시판이 되면 비로그인/비인증 사용자에게서 완전히 숨겨지게 되며, 접근 권한도 박탈됩니다.</p>
      {/if}
    </div>
  </div>
</div>
<style lang="scss">
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
</style>