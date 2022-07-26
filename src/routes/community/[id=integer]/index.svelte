<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import HttpStatus from 'http-status-codes';
  import {ArticleItemDto} from '$lib/types/dto/article-item.dto';

  export async function load({params, url, fetch}: LoadEvent): Promise<LoadOutput> {
    const nr = await fetch(`/community/${params.id}/api/info`);
    const {name} = await nr.json();
    if (!name) {
      return {
        status: HttpStatus.NOT_FOUND,
        error: '없는 게시판입니다.'
      }
    }
    const page = url.searchParams.get('page') ?? '1';
    const res = await fetch(`${url.pathname}/api/list?page=${page}`);
    const {list, maxPage} = await res.json() as {list: ArticleItemDto[], maxPage: number};
    if (parseInt(page) > maxPage) {
      return {
        status: HttpStatus.NOT_FOUND,
        error: 'Not found',
      }
    }
    const id = params.id;
    const bestR = await fetch(`${url.pathname}/api/best`);
    const {bests} = await bestR.json() as {bests: ArticleItemDto[],};
    /*
    const authors = list.map(a => a.author).join(',');
    const authorsInfoRequests = await fetch(`/user/profile/api/detail?ids=${authors}`);
    const users = {};
    if (authorsInfoRequests.ok) {
      const authorInfos = await authorsInfoRequests.json() as {users: IUser[]};
      for (const user of authorInfos.users) {
        users[user._key] = user;
      }
    }*/

    const autoTag = /^[[(]?([a-zA-Z가-힣@]+?)[\])]/gm;

    return {
      status: 200,
      props: {
        list: list.map((item) => {
          const regx = autoTag.exec(item.title.trim());
          // console.log(item.title, regx);
          if (regx) {
            item.autoTag = regx[1];
          }
          return item;
        }),
        id,
        params,
        name,
        // users,
        currentPage: parseInt(page),
        maxPage,
        bests,
      },
    }
  }
</script>
<script lang="ts">
  import ArticleList from '$lib/components/ArticleList.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import Refresh from 'svelte-material-icons/Refresh.svelte';
  import Circle from 'svelte-material-icons/Circle.svelte';

  import {afterNavigate} from '$app/navigation';
  import {session} from '$app/stores';
  import {isEmpty} from 'lodash-es';
  import {EUserRanks} from '$lib/types/user-ranks';
  import {onDestroy, onMount} from 'svelte';
  import {Pusher} from '$lib/pusher/client';
  import type {Unsubscribable} from 'rxjs';
  import type {IUser} from '$lib/types/user';

  export let list: ArticleItemDto[];
  export let bests: ArticleItemDto[];
  export let params;
  export let id: string = params.id;
  export let name: string;
  // export let users: Record<string, IUser>;
  export let currentPage: number;
  export let maxPage: number;

  afterNavigate(({from, to}) => {
    const page = to.searchParams.get('page');
  });

  let buffer: INewPublishedArticle[] = [];
  const unsubs: Unsubscribable[] = [];
  let bestScrollPage = 1;

  let pusher: Pusher;

  onMount(() => {
    //*
    pusher = new Pusher(`@${params.id}`);

    window.addEventListener('unload', clearSubscribes);

    try {
      const articleUpdated = pusher.observable<INewPublishedArticle>('article');
      unsubs.push(articleUpdated.subscribe(newArticlePublished));
    } catch {
      //
    } // */
  });

  function newArticlePublished({body}: {body: INewPublishedArticle}) {
    if (body.key && typeof body.key === 'string') {
      buffer = [body, ...buffer];
    }
  }

  function updateList() {
    const autoTagRegex = /^[[(]?([a-zA-Z가-힣@]+?)[\])]/gm;
    const newArticles: ArticleItemDto[] = buffer.map(item => {
      const regx = autoTagRegex.exec(item.title.trim());
      let autoTag: string | undefined;
      // console.log(item.title, regx);
      if (regx) {
        autoTag = regx[1];
      }

      return {
        autoTag,
        _key: item.key,
        title: item.title,
        author: item.author,
        tags: item.tags,
        image: item.image,
        views: 1,
        createdAt: new Date,
      }
    });

    // todo: make list limit to max
    list = [...newArticles, ...list]; // .slice(0, 30);
    buffer = [];
  }

  interface INewPublishedArticle {
    title: string;
    key: string;
    author: {
      id: string;
      _key: string;
      avatar?: string;
      rank: EUserRanks;
    };
    image?: string;
    tags: Record<string, number>;
  }

  function checkPage(event: Event) {
    if (event.type === 'scroll') {
      const target = event.target as HTMLDivElement;
      // console.log(target.scrollWidth, target.offsetWidth, target.clientWidth, target.scrollLeft);
      bestScrollPage = target.scrollLeft <= 100 ? 1 : 2;
    }
  }

  function clearSubscribes() {
    for (const u of unsubs) {
      u.unsubscribe();
    }
    if (pusher) {
      pusher.close();
    }
  }

  onDestroy(() => {
    clearSubscribes();
  });

  // console.log(id, params);
</script>

<svelte:head>
  <title>루헨 - {name}</title>
</svelte:head>

<div class="justify-between flex-col flex-row"></div>

<!-- todo: move to __layout -->
<div class="w-11/12 md:w-4/5 lg:w-3/4 mx-auto space-y-2 transition-transform __mobile-bottom-fix">
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
      <!--
      <span class="inline sm:hidden">none</span>
      <span class="hidden sm:inline md:hidden">sm</span>
      <span class="hidden sm:hidden md:inline lg:hidden">md</span>
      <span class="hidden sm:hidden md:hidden lg:inline">lg</span>
      -->
    </h2>
    {#if $session.user}
      <div class="space-x-2">
        {#if $session.user.rank >= EUserRanks.Manager}
          <a href="/community/{params.id}/manage"
             class="px-4 py-2 inline-block ring-1 ring-red-400 hover:bg-red-400
         hover:text-white rounded-md shadow-md transition-colors dark:bg-red-700
         dark:ring-0 dark:hover:bg-red-600">
            관리
          </a>
        {/if}

        <a href="/community/{params.id}/write"
           class="px-4 py-2 inline-block ring-1 ring-sky-400 hover:bg-sky-400
         hover:text-white rounded-md shadow-md transition-colors dark:bg-sky-600
         dark:ring-0 dark:hover:bg-sky-400">
          새 글 쓰기
        </a>
      </div>
    {/if}
  </div>

  {#if !isEmpty(bests)}
    <div class="rounded-md shadow-md px-4 py-2 bg-zinc-50 dark:bg-gray-500/50">
      <div class="flex justify-between text-sm mb-2">
        <span class="text-zinc-600 dark:text-zinc-200">베스트 목록</span>
        <a class="underline decoration-sky-400" href="/community/{params.id}/best">전체 보기</a>
      </div>
      <div id="__best-list" on:scroll={checkPage}
           class="overflow-x-scroll snap-mandatory snap-x relative inline-block flex flex-row">

        <div class="snap-center w-full flex-grow flex-shrink-0 sm:flex-shrink">
          <ol class="w-full inline-block divide-y divide-zinc-200 dark:divide-zinc-400 space-y-1">
            {#each bests.slice(0, 5) as best}
              <li>
                <a class="block mt-1" href="/community/{params.id}/{best._key}?page={currentPage}">
                  <div class="inline-block px-4 py-2 sm:px-2 md:py-1 hover:bg-zinc-200/70 dark:hover:bg-gray-600 rounded-md transition-colors min-w-0">
                    <p class="truncate text-sm">{best.title}</p>
                  </div>
                </a>
              </li>
            {/each}
          </ol>
        </div>

        {#if bests.length > 5}
          <div class="snap-center w-full flex-gro flex-shrink-0 sm:flex-shrink">
            <ol class="w-full inline-block divide-y divide-zinc-200 dark:divide-zinc-400 space-y-1">
              {#each bests.slice(5) as best}
                <li>
                  <a class="block mt-1" href="/community/{params.id}/{best._key}?page={currentPage}">
                    <div class="inline-block px-4 py-2 sm:px-2 md:py-1 hover:bg-zinc-200/70 dark:hover:bg-gray-600 rounded-md transition-colors min-w-0">
                      <p class="truncate text-sm">{best.title}</p>
                    </div>
                  </a>
                </li>
              {/each}
            </ol>
          </div>
        {/if}

      </div>
      <div class="visible sm:invisible flex justify-center text-zinc-400 space-x-1">
        <span class:text-zinc-100={bestScrollPage <= 1}>
          <Circle size="0.5rem" />
        </span>
        <span class:text-zinc-100={bestScrollPage > 1}>
          <Circle size="0.5rem" />
        </span>
      </div>
    </div>
  {/if}

  <div class="flex justify-center text-sm">

    {#if isEmpty(buffer)}
      <hr class="mt-4 h-3 border-zinc-200 dark:border-gray-400 border-dashed w-full block" />
    {:else}
      <button on:click={updateList} class="text-zinc-600 hover:bg-zinc-100 hover:text-sky-400 dark:text-zinc-300 dark:hover:bg-gray-500 dark:hover:text-zinc-200 rounded-md px-2 py-1 select-none transition-colors">
        <Refresh /> 새 게시물이 있습니다.
      </button>
    {/if}
  </div>

  <ArticleList board={id} {list} />

  <div class="pb-8 space-y-2">
    <Pagination base="/community/{params.id}" q="page" current="{currentPage}" max="{maxPage}" />
  </div>
</div>

<style lang="scss">
  // ios bottom gap
  // noinspection CssOverwrittenProperties
  .__mobile-bottom-fix {
    margin-bottom: 1rem;
    // noinspection CssInvalidFunction
    margin-bottom: constant(safe-area-inset-bottom);
    margin-bottom: env(safe-area-inset-bottom);
  }

  #__best-list {
    &::-webkit-scrollbar {
      display: none;
    }

    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>