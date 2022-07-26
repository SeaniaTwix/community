<script lang="ts">
  import {page} from '$app/stores';

  function removePermanantly() {

  }

  function togglePub() {

  }
</script>
<div class="w-4/6 sm:w-2/3 md:w-1/2 lg:w-1/3 mx-auto space-y-4">
  <h1>제목</h1>

  <div class="space-y-2">
    <button on:click={togglePub} class="bg-amber-400 dark:bg-amber-600 rounded-md w-full py-2 block text-center shadow-md">
      게시글 명시성 변경 (현재 표시 중)
    </button>
    <button on:click={removePermanantly} class="text-white bg-red-600 dark:bg-red-700 rounded-md w-full py-2 block text-center shadow-md">
      게시글 완전히 삭제
    </button>
  </div>


  <a href="/community/{$page.params.id}/{$page.params.article}/manage/tags"
     class="bg-zinc-100 dark:bg-gray-500 rounded-md w-full py-2 block text-center shadow-md">
    태그 관리하기
  </a>
</div>