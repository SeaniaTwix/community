<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';

  export async function load({params, fetch}: LoadEvent): Promise<LoadOutput> {
    const nr = await fetch(`/community/${params.id}/api/info`);
    const {name} = await nr.json();
    const res = await fetch(`/community/${params.id}/${params.article}/api/read`);
    const {article} = await res.json();
    return {
      status: 200,
      props: { article, boardName: name },
    }
  }
</script>
<script lang="ts">
  import TimeAgo from 'javascript-time-ago';
  // import ko from 'javascript-time-ago/locale/ko';
  import Upload from 'svelte-material-icons/Upload.svelte';
  import View from 'svelte-material-icons/Eye.svelte';
  import Plus from 'svelte-material-icons/Plus.svelte';
  import {ko} from '$lib/time-ko';

  /**
   * 게시글 보기
   */
  TimeAgo.addLocale(ko);
  const timeAgo = new TimeAgo('ko-KR');
  export let article;
  export let boardName: string;
  console.log(article);

  function addComment() {

  }

  function detectSend(event: KeyboardEvent) {
    if (event.isComposing || event.keyCode === 229) {
      return;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      // console.log(event.ctrlKey, event.metaKey);
      event.preventDefault();
      addComment();
    }
  }
</script>

<div class="w-10/12 md:w-3/5 lg:w-3/5 mx-auto flex flex-col justify-between __fixed-view">

  <nav class="flex ml-4 grow-0 shrink" aria-label="Breadcrumb">
    <ol class="inline-flex items-center space-x-1 md:space-x-3">
      <li class="inline-flex items-center">
        <a href="/" class="inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          <svg class="mr-2 w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>
          홈
        </a>
      </li>
      <li>
        <div class="flex items-center">
          <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
          <a href="/community/{article.board}" class="ml-1 text-sm font-medium text-gray-700 hover:text-gray-900 md:ml-2 dark:text-gray-400 dark:hover:text-white">
            {boardName}
          </a>
        </div>
      </li>
      <li aria-current="page">
        <div class="flex items-center">
          <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
          <span class="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400">
            {article.title}
          </span>
        </div>
      </li>
    </ol>
  </nav>

  <div class="p-4 space-y-4 overflow-y-scroll grow">
    <div class="p-4 rounded-md shadow-md transition-transform divide-y divide-dotted">
      <div class="flex justify-between mb-2">
        <h2 class="text-2xl flex-shrink">{article.title}</h2>
        <div>
          <span><View size="1rem" /> {article.views ?? 1}</span>
          <time class="text-zinc-500 dark:text-zinc-300 text-sm">
            {timeAgo.format(new Date(article.createdAt))}
          </time>
        </div>
      </div>
      <div class="p-2 min-h-[10rem]">
        {@html article.content}
      </div>
      <div class="pt-3">
        <span class="rounded-md bg-zinc-100 dark:bg-gray-700 px-2 py-1 transition transition-transform cursor-pointer">
          <Plus size="1rem"/>새 태그 추가
        </span>
      </div>
    </div>

    <div> <!-- 댓글 -->
      <ul class="space-y-2">
        <li>
          <div class="p-4 rounded-md shadow-md min-h-[8rem]">
            <div class="flex mb-2 space-x-2">
              <div class="w-12 min-h-[3rem]">
                <picture>
                  <img class="w-full h-full __circle-image object-cover border-2 border-white shadow-md"
                       src="https://s3.ap-northeast-2.wasabisys.com/s3.now.gd/IMG_2775.GIF" alt="hello" />
                </picture>
              </div>
              <span class="text-xl mt-2">일립시S</span>
            </div>
            <div class="flex flex-col justify-between">
              <div class="grow">
                <p>헬로</p>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>

  <div class="overflow-hidden rounded-t-md shadow-md bg-gray-50/50 h-32 max-h-[8rem] flex flex-col relative grow-0 shrink">
    <div class="px-2">
      <input type="file" class="hidden" />
      <button class="text-zinc-700 hover:text-zinc-900 p-1 cursor-pointer ">
        <Upload size="1.25rem" />
      </button>
    </div>
    <div class="w-full flex flex-row grow shrink-0">
      <textarea class="bg-gray-100 dark:bg-gray-300 p-4 grow h-full focus:outline-none shadow-md dark:text-gray-800"
                on:keydown={detectSend}
                placeholder="댓글을 입력하세요..."></textarea>
      <button class="px-4 bg-sky-200 dark:bg-sky-800">작성</button>
    </div>
  </div>
</div>

<style lang="scss">
  .__fixed-view {
    height: calc(100vh - 62px);
  }

  .__circle-image {
    border-radius: 50%;
  }
</style>
