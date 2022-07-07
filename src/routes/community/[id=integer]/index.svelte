<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import type {ArticleDto} from '$lib/types/dto/article.dto';
  import type {IUser} from '$lib/types/user';
  import HttpStatus from 'http-status-codes';

  export async function load({params, url, fetch}: LoadEvent): Promise<LoadOutput> {
    const nr = await fetch(`/community/${params.id}/api/info`);
    const {name} = await nr.json();
    if (!name) {
      return {
        status: HttpStatus.NOT_FOUND,
        error: '없는 게시판입니다.'
      }
    }
    const res = await fetch(`${url.pathname}/api/list`);
    const {list} = await res.json() as {list: ArticleDto[]};
    const id = params.id;
    const authors = list.map(a => a.author).join(',');
    const authorsInfoRequests = await fetch(`/user/profile/api/detail?ids=${authors}`);
    const users = {};
    if (authorsInfoRequests.ok) {
      const authorInfos = await authorsInfoRequests.json() as {users: IUser[]};
      for (const user of authorInfos.users) {
        users[user._key] = user;
      }
    }

    return {
      status: 200,
      props: {list, id, params, name, users,},
    }
  }
</script>
<script lang="ts">
  import ArticleList from '$lib/components/ArticleList.svelte';
  import {onMount} from 'svelte';

  export let list: ArticleDto[];
  export let id: string;
  export let params;
  export let name: string;
  export let users: Record<string, IUser>;

  onMount(() => {
    id = params.id;
  })

  // console.log(id, params);
</script>

<svelte:head>
  <title>게시판 - {name}</title>
</svelte:head>

<!-- todo: move to __layout -->
<div class="w-10/12 md:w-4/5 lg:w-3/4 mx-auto space-y-4 transition-transform __mobile-bottom-fix">
  <nav class="flex ml-4 grow-0 shrink" aria-label="Breadcrumb">
    <ol class="inline-flex items-center space-x-1 md:space-x-3">
      <li class="inline-flex items-center">
        <a href="/" class="inline-flex items-center text-sm font-medium text-gray-700 hover:text-sky-400 dark:text-gray-400 dark:hover:text-white">
          <svg class="mr-2 w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>
          홈
        </a>
      </li>
      <li aria-current="page">
        <div class="flex items-center">
          <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
          <span class="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400">
            {name}
          </span>
        </div>
      </li>
    </ol>
  </nav>

  <div class="flex justify-between">
    <h2 class="text-2xl">
      {name}
      <span class="inline sm:hidden">none</span>
      <span class="hidden sm:inline md:hidden">sm</span>
      <span class="hidden sm:hidden md:inline lg:hidden">md</span>
      <span class="hidden sm:hidden md:hidden lg:inline">lg</span>
    </h2>
    <a href="/community/{params.id}/write"
       class="px-4 py-2 inline-block ring-1 ring-sky-400 hover:bg-sky-400
         hover:text-white rounded-md shadow-md transition-colors dark:bg-sky-600
         dark:ring-0 dark:hover:bg-sky-400">
      새 글 쓰기
    </a>
  </div>
  <ArticleList board={id} {list} {users} />
</div>

<style lang="scss">
  // ios bottom gap
  // noinspection CssOverwrittenProperties
  .__mobile-bottom-fix {
    margin-bottom: 0;
    // noinspection CssInvalidFunction
    margin-bottom: constant(safe-area-inset-bottom);
    margin-bottom: env(safe-area-inset-bottom);
  }
</style>