<script lang="ts">
  /* eslint-disable no-redeclare */
  import ArticleList from '$lib/components/ArticleList.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import Refresh from 'svelte-material-icons/Refresh.svelte';
  import Circle from 'svelte-material-icons/Circle.svelte';
  import List from 'svelte-material-icons/ViewList.svelte';
  import Gallery from 'svelte-material-icons/ViewGallery.svelte';

  import {afterNavigate, goto} from '$app/navigation';
  import {page} from '$app/stores';
  import {isEmpty} from 'lodash-es';
  import {EUserRanks} from '$lib/types/user-ranks';
  import {onDestroy} from 'svelte';
  import {Pusher} from '$lib/pusher/client';
  import GalleryList from '$lib/components/GalleryList.svelte';
  import Cookies from 'js-cookie';
  import type {PageData} from './$types';
  import {ArticleItemDto} from '$lib/types/dto/article-item.dto';
  import {client} from '$lib/auth/user/client.js';
  import type {UI} from '@root/app';

  export let data: PageData & {ui?: UI};

  declare var articles: typeof data.articles;
  $: articles = data.articles;
  $: announcements = data.announcements;
  declare var bests: typeof data.bests;
  $: bests = data.bests;
  $: id = $page.params.id;
  declare var name: string;
  $: name = data.name;
  $: currentPage = data.currentPage;
  declare var maxPage: typeof data.maxPage;
  $: maxPage = data.maxPage;
  declare var listType: 'list' | 'gallery'
  $: listType = ($client.ui?.listType ?? data.ui?.listType) ?? 'list';
  declare var showBest: boolean;
  $: showBest = isEmpty(announcements);

  /*
  async function reload() {
    const newData = await ky.get(`/community/${$page.params.id}/api/list?${$page.url.searchParams}`).json();
    data = newData as any;
    articles = data.articles;
    announcements = data.announcements;
    bests = data.bests;
    id = $page.params.id;
    name = data.name;
    currentPage = data.currentPage;
    maxPage = data.maxPage;
    listType = ($client.ui?.listType ?? data.ui?.listType) ?? 'list';
    showBest = isEmpty(announcements);
  } */

  afterNavigate(({from, to}) => {
    // const page = to.searchParams.get('page');
    console.log(from?.url.pathname, to?.url.pathname)
    if (from?.url.pathname + '?' + from?.url.searchParams !== to?.url.pathname + '?' + to?.url.searchParams) {
      if (pusher) {
        pusher.destory();
      }

      pusher = new Pusher(`@${$page.params.id}`);
      pusher.subscribe<INewPublishedArticle>('article', newArticlePublished);
    }
  });

  async function getRecentList() {
    const p = $page.url.searchParams.get('page') ?? '1';
    const res = await fetch(`${$page.url.pathname}/api/list?page=${p}`);
    return await res.json() as PageData;
  }

  async function fullRefresh() {
    const newList = await getRecentList();

    if (!$client?.ui) {
      throw new Error('ui is ' + $client?.ui);
    }

    $client.ui.listType = listType;

    articles = newList.articles;
    bests = newList.bests;
    maxPage = newList.maxPage;
  }

  function toggleViewMode() {
    buffer = [];

    listType = listType === 'list' ? 'gallery' : 'list';

    Cookies.set('list_type', listType);

    fullRefresh().then();
  }

  let buffer: INewPublishedArticle[] = [];
  let bestScrollPage = 1;

  let pusher: Pusher;

  let userContextMenuIndex = -1;

  function changeClickedUser(event: CustomEvent<{ already: boolean, i: number }>) {
    if (event.detail.already) {
      userContextMenuIndex = -1;
    } else {
      userContextMenuIndex = event.detail.i;
    }
  }

  function newArticlePublished({body}: { body: INewPublishedArticle }) {
    // noinspection SuspiciousTypeOfGuard
    if (body.key && typeof body.key === 'string') {
      userContextMenuIndex = -1;
      buffer = [body, ...buffer];
    }
  }

  function updateListFromBuffer() {
    const autoTagRegex = /^[[(]?([a-zA-Z가-힣@]+?)[\])]/gm;
    const newArticles: ArticleItemDto[] = buffer.map(item => {
      const regx = autoTagRegex.exec(item.title.trim());
      let autoTag: string | undefined;
      // console.log(item.title, regx);
      if (regx) {
        autoTag = regx[1];
      }

      return {
        _key: item.key,
        autoTag,
        createdAt: new Date,
        images: listType === 'list' ? typeof item.image === 'string' : item.image as any,
        locked: false,
        tags: item.tags,
        title: item.title.trim(),
        views: 1,
      };
    });

    // todo: make list limit to max
    articles = [...newArticles, ...articles]; // .slice(0, 30);
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
    image?: string | boolean;
    tags: Record<string, number>;
  }

  function checkPage(event: Event) {
    if (event.type === 'scroll') {
      const target = event.target as HTMLDivElement;
      // console.log(target.scrollWidth, target.offsetWidth, target.clientWidth, target.scrollLeft);
      bestScrollPage = target.scrollLeft <= 100 ? 1 : 2;
    }
  }

  onDestroy(() => {
    if (pusher) {
      pusher.destory();
    }
  });

  function forceShowBest() {
    showBest = true;
  }

  function forceShowAnnouncements() {
    if (!isEmpty(announcements)) {
      showBest = false;
    } else {
      goto('/community/search?q=' + encodeURIComponent('#공지'));
    }
  }

  // console.log(id, params);
</script>

<svelte:head>
  <title>루헨 - {name}</title>
</svelte:head>

<div class="justify-between flex-col flex-row"></div>

<!-- todo: move to __layout -->
<div class="w-11/12 md:w-4/5 lg:w-3/4 xl:w-3/5 2xl:w-[60%] mx-auto space-y-2 transition-transform __mobile-bottom-fix">
  <nav class="flex ml-4 grow-0 shrink" aria-label="Breadcrumb">
    <ol class="inline-flex items-center space-x-1 md:space-x-3">
      <li class="inline-flex items-center">
        <a href="/"
           class="inline-flex items-center text-sm font-medium text-gray-700 hover:text-sky-400 dark:text-gray-400 dark:hover:text-white">
          <svg class="mr-2 w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
          </svg>
          홈
        </a>
      </li>
      <li aria-current="page">
        <div class="flex items-center">
          <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clip-rule="evenodd"></path>
          </svg>
          <span class="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400">
            {name}
          </span>
        </div>
      </li>
    </ol>
  </nav>

  <div class="flex justify-between items-center" class:pb-2={!isEmpty(bests)}
       class:flex-row-reverse={($client.ui?.buttonAlign ?? data.ui?.buttonAlign) === 'left'}>
    <a href="/community/{$page.params.id}" on:click|preventDefault={fullRefresh}>
      <h2 class="text-2xl">
        {name}

        <!--span class="inline sm:hidden">none</span>
        <span class="hidden sm:inline md:hidden">sm</span>
        <span class="hidden md:inline lg:hidden">md</span>
        <span class="hidden lg:inline xl:hidden">lg</span>
        <span class="hidden xl:inline 2xl:hidden">xl</span>
        <span class="hidden 2xl:inline">2xl</span-->

      </h2>
    </a>
    {#if $client?.user ?? data?.user}
      <div class="space-x-2" class:flex-row-reverse={($client.ui?.buttonAlign ?? data.ui?.buttonAlign) === 'left'}>
        {#if data.user.rank >= EUserRanks.Manager}
          <a href="/community/{$page.params.id}/manage"
             class="px-4 py-2 inline-block ring-1 ring-red-400 hover:bg-red-400
         hover:text-white rounded-md shadow-md transition-colors dark:bg-red-700
         dark:ring-0 dark:hover:bg-red-600">
            관리
          </a>
        {/if}

        <a href="/community/{$page.params.id}/write"
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
        <span class:flex-row-reverse={!isEmpty(announcements)}
              class="text-zinc-600 dark:text-zinc-200 flex flex-row gap-2 items-center">
          <button on:click={forceShowBest}
                  class:text-zinc-400={!showBest}
                  class="{showBest ? 'bg-zinc-400/25' : ''} hover:bg-zinc-300/25 px-1 rounded-md transition-all">
            베스트 목록
          </button>
          <span class="text-xs">/</span>
          <button on:click={forceShowAnnouncements}
                  class:text-red-500={!showBest}
                  class:dark:text-red-400={!showBest}
                  class="{!showBest ? 'bg-zinc-400/25' : ''} {!isEmpty(announcements) ? 'hover:bg-zinc-300/25' : '' } px-1 rounded-md transition-all">
            공지사항
            {#if isEmpty(announcements)}
              (모두 읽음)
            {/if}
          </button>
        </span>
        <a class="underline decoration-sky-400" href="/community/{$page.params.id}/best">전체 보기</a>
      </div>

      <div id="__top-list" on:scroll={checkPage}
           class="overflow-x-scroll snap-mandatory snap-x relative inline-block flex flex-row gap-4">

        <div class="snap-center w-full flex-grow flex-shrink-0 sm:flex-shrink truncate min-w-0">
          <ol class="w-full inline-block divide-y divide-zinc-200 dark:divide-zinc-400 space-y-1">
            {#if showBest}
              {#each bests.slice(0, 5) as best}
                <li>
                  <a class="block mt-1 px-1" href="/community/{$page.params.id}/{best._key}?page={currentPage}">
                    <div class="px-3 py-1.5 sm:px-2 md:py-1 hover:bg-zinc-200/70 dark:hover:bg-gray-600 rounded-md transition-colors min-w-0">
                      <p class="truncate text-sm">{best.title}</p>
                    </div>
                  </a>
                </li>
              {/each}
            {:else}
              {#each announcements.slice(0, 5) as anno}
                <li>
                  <a class="block mt-1 px-1" href="/community/{$page.params.id}/{anno._key}?page={currentPage}">
                    <div class="px-3 py-1.5 sm:px-2 md:py-1 hover:bg-zinc-200/70 dark:hover:bg-gray-600 rounded-md transition-colors min-w-0">
                      <p class="truncate text-sm">{anno.title}</p>
                    </div>
                  </a>
                </li>
              {/each}
            {/if}
          </ol>
        </div>

        {#if bests.length > 5 || announcements.length > 5}
          <div class="snap-center w-full flex-grow flex-shrink-0 sm:flex-shrink truncate">
            <ol class="w-full inline-block divide-y divide-zinc-200 dark:divide-zinc-400 space-y-1">
              {#if showBest}
                {#each bests.slice(5) as best}
                  <li>
                    <a class="block mt-1 px-1" href="/community/{$page.params.id}/{best._key}?page={currentPage}">
                      <div class="px-3 py-1.5 sm:px-2 md:py-1 hover:bg-zinc-200/70 dark:hover:bg-gray-600 rounded-md transition-colors min-w-0">
                        <p class="truncate text-sm">{best.title}</p>
                      </div>
                    </a>
                  </li>
                {/each}
              {:else}
                {#each announcements.slice(5) as anno}
                  <li>
                    <a class="block mt-1 px-1" href="/community/{$page.params.id}/{anno._key}?page={currentPage}">
                      <div class="px-3 py-1.5 sm:px-2 md:py-1 hover:bg-zinc-200/70 dark:hover:bg-gray-600 rounded-md transition-colors min-w-0">
                        <p class="truncate text-sm">{anno.title}</p>
                      </div>
                    </a>
                  </li>
                {/each}
              {/if}
            </ol>
          </div>
        {/if}

      </div>

      <div class="block sm:hidden flex justify-center text-zinc-300 dark:text-zinc-400 space-x-1">
        <span class="transition-colors" class:text-zinc-500={bestScrollPage <= 1}
              class:dark:text-zinc-100={bestScrollPage <= 1}>
          <Circle size="0.5rem"/>
        </span>
        <span class="transition-colors" class:text-zinc-500={bestScrollPage > 1}
              class:dark:text-zinc-100={bestScrollPage > 1}>
          <Circle size="0.5rem"/>
        </span>
      </div>
    </div>
  {/if}

  <div class="flex flex-row text-sm pt-0.5">

    <button on:click={toggleViewMode}
            class="text-zinc-600 hover:bg-zinc-100 hover:text-sky-400 dark:text-zinc-300 dark:hover:bg-gray-500 dark:hover:text-zinc-200 rounded-md px-2 py-1 select-none transition-colors" >
      {#if listType === 'list'}
        <List /> 리스트로 보는 중
      {:else}
        <Gallery /> 갤러리로 보는 중
      {/if}
    </button>

    {#if !isEmpty(buffer)}
      <button on:click={updateListFromBuffer}
              class="text-zinc-600 hover:bg-zinc-100 hover:text-sky-400 dark:text-zinc-300 dark:hover:bg-gray-500 dark:hover:text-zinc-200 rounded-md px-2 py-1 select-none transition-colors">
        <Refresh/>
        새 게시물이 있습니다.
      </button>
    {/if}
  </div>

  {#if listType === 'list'}
    <ArticleList user="{$client?.user ?? data?.user}" board={id} list="{articles}" on:userclick={changeClickedUser} showingUserContextMenuIndex="{userContextMenuIndex}"/>
  {:else if listType === 'gallery'}
    <GalleryList board={id} list="{articles}" on:userclick={changeClickedUser} showingUserContextMenuIndex="{userContextMenuIndex}"/>
  {:else}
    <p>정의되지 않음.</p>
  {/if}

  {#if $client?.user ?? data?.user}
    <div class="flex flex-row justify-end" class:flex-row-reverse={($client.ui?.buttonAlign ?? data.ui?.buttonAlign) === 'left'}>
      <a href="/community/{$page.params.id}/write"
         class="px-3 py-1.5 inline-block ring-1 ring-sky-400 hover:bg-sky-400
         hover:text-white rounded-md shadow-md transition-colors dark:bg-sky-600
         dark:ring-0 dark:hover:bg-sky-400">
        새 글 쓰기
      </a>
    </div>
  {/if}

  <div class="pb-8 space-y-2">
    <Pagination base="/community/{$page.params.id}" q="page" current="{currentPage}" max="{maxPage}"/>
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

  #__top-list {
    &::-webkit-scrollbar {
      display: none;
    }

    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>