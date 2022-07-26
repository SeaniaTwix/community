<script lang="ts">
  import Back from 'svelte-material-icons/ArrowLeftBold.svelte'
  import {page} from '$app/stores';

  let minLikeForBest = 1;

  function unpubAll() {

  }

  function truncateBoard() {

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

  <div class="space-y-2">
    <div class="relative shadow-md rounded-md bg-zinc-50 dark:bg-gray-500 flex flex-col space-x-4">
      <span class="absolute  px-4 py-2  text-zinc-500 dark:text-zinc-300 flex-shrink-0 pointer-events-none">베스트 추천 조건</span>
      <input type="number" placeholder="1 이상의 값을 입력해주세요"
             bind:value={minLikeForBest} autocorrect="off" autocapitalize="none"
             class="w-full pl-32 pr-4 py-2 bg-transparent outline-none focus:outline-0 rounded-md">
    </div>
    <button class="bg-zinc-100 dark:bg-gray-500 rounded-md w-full py-2 block text-center shadow-md">적용</button>
  </div>
</div>
<style lang="scss">
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
</style>