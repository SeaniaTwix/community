<script lang="ts">
  import type {PageData} from '@routes/$types';

  export let data: PageData;
</script>

<svelte:head>
  <title>루헨 - 홈</title>
  <meta name="description" content="커뮤니티 루헨">
</svelte:head>

<div class="w-full flex flex-row justify-center mt-4">
  <div>
    <a href="/settings" role="button"
       class="block text-center w-40 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-gray-500 rounded-md shadow-md ring-1 ring-zinc-400 my-2 transition-colors">
      설정 페이지
    </a>


  </div>
</div>