<script lang="ts">
  /**
   * 특정 사람 프로파일 보기
   */
  import CircleAvatar from '$lib/components/CircleAvatar.svelte';
  import ChevronRight from 'svelte-material-icons/ChevronRight.svelte'
  import Manage from 'svelte-material-icons/Toolbox.svelte'
  import type {PageData} from './$types';
  import {page} from '$app/stores';

  export let data: PageData;
</script>

<div class="space-y-2">
  <header class="bg-sky-400 -mt-2 h-48 relative">
    <div class="w-11/12 md:w-4/5 lg:w-3/4 xl:w-3/5 2xl:w-[60%] mx-auto relative h-full">
      <div class="flex flex-row items-center gap-4 absolute -bottom-4 w-full">
        <div class="w-32 bg-white __circle-image flex-shrink-0">
          <CircleAvatar />
        </div>
        <div class="flex flex-row justify-between items-center flex-grow w-full">
          <span class="text-white text-3xl">{data.user.sub.split('/', 2)[1]}</span>
          <div class="space-x-1.5">
            <a href="/user/admin/ban?uid={$page.params.uid}">
              <button class="hover:text-red-600 align-middle">
                <Manage />
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  </header>

  <div class="w-11/12 md:w-4/5 lg:w-3/4 xl:w-3/5 2xl:w-[60%] mx-auto pt-8">
    <div>

      <div class="flex flex-row justify-between items-center">
        <h2 class="text-xl font-bold text-zinc-800">작성글</h2>
        <a href="/community/search?q={encodeURIComponent(`@${data.user.sub.split('/', 2)[1]}`)}">
          <button class="flex flex-row items-center hover:text-sky-400">
              더 보기
              <ChevronRight />
          </button>
        </a>

      </div>

      <div class="p-4">
        게시글 목록...
      </div>

    </div>
  </div>
</div>

<style>
  .__circle-image {
    border-radius: 50%;
    aspect-ratio: 1/1;
  }
</style>