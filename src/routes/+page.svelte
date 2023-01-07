<script lang="ts">
  import type {PageData} from '@routes/$types';

  export let data: PageData;
</script>

<svelte:head>
  <title>루헨 - 홈</title>
  <meta name="description" content="커뮤니티 루헨">
</svelte:head>

<div class="w-full text-center mt-4">
  <h1 class="text-3xl">테스트 중</h1>
  <p>
    현재 버전:
    <a class="text-sky-400 underline"
       href="https://github.com/SeaniaTwix/community/commit/{data.version}">
      {data.version.slice(0, 7)}
    </a>
  </p>
</div>