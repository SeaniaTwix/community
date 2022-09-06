<script lang="ts">
  import {client} from '$lib/auth/user/client';

  import ArticleList from '$lib/components/ArticleList.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import List from 'svelte-material-icons/ViewList.svelte';
  import Gallery from 'svelte-material-icons/ViewGallery.svelte';

  import {isEmpty} from 'lodash-es';
  import {EUserRanks} from '$lib/types/user-ranks';
  import GalleryList from '$lib/components/GalleryList.svelte';
  import Cookies from 'js-cookie';
  import {page} from '$app/stores';
  import type {ArticleItemDto} from '$lib/types/dto/article-item.dto';
  import type {PageData} from '@routes/community/[id=integer]/best/$types';

  export let data: PageData;

  let articles: ArticleItemDto[] = data.articles;
  let bests: ArticleItemDto[];
  let name: string = data.boardName;
  let currentPage: number = data.currentPage;
  export let maxPage: number = data.maxPage;
  let listType = $client?.ui?.listType ?? 'list';

  async function fullRefresh() {
    const p = $page.url.searchParams.get('page') ?? '1';
    const res = await fetch(`${$page.url.pathname}/api/list?page=${p}`);
    return await res.json() as { list: ArticleItemDto[], maxPage: number };
  }

  async function toggleViewMode() {
    listType = listType === 'list' ? 'gallery' : 'list';

    Cookies.set('list_type', listType);

    const {list: l, maxPage: mp} = await fullRefresh();

    client.update((s) => {
      s.ui.listType = listType;
      return s;
    });

    articles = l;
    maxPage = mp;
  }

  let userContextMenuIndex = -1;

  function changeClickedUser(event: CustomEvent<{ already: boolean, i: number }>) {
    if (event.detail.already) {
      userContextMenuIndex = -1;
    } else {
      userContextMenuIndex = event.detail.i;
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
      <li class="flex-shrink-0">
        <div class="flex items-center">
          <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20"
               xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clip-rule="evenodd"></path>
          </svg>
          <a href="/community/{$page.params.id}"
             class="ml-1 text-sm font-medium text-gray-700 md:ml-2 dark:text-gray-400 dark:hover:text-white hover:text-sky-400 hover:drop-shadow w-max">
            {name}
          </a>
        </div>
      </li>
      <li aria-current="page">
        <div class="flex items-center">
          <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clip-rule="evenodd"></path>
          </svg>
          <span class="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400">
            베스트
          </span>
        </div>
      </li>
    </ol>
  </nav>

  <div class="flex justify-between items-center" class:pb-2={!isEmpty(bests)}
       class:flex-row-reverse={$client?.ui?.buttonAlign === 'left'}>
    <h2 class="text-2xl">
      {name} 베스트

      <!--span class="inline sm:hidden">none</span>
      <span class="hidden sm:inline md:hidden">sm</span>
      <span class="hidden md:inline lg:hidden">md</span>
      <span class="hidden lg:inline xl:hidden">lg</span>
      <span class="hidden xl:inline 2xl:hidden">xl</span>
      <span class="hidden 2xl:inline">2xl</span-->

    </h2>
    {#if ($client?.user ?? data?.user)}
      <div class="space-x-2" class:flex-row-reverse={($client?.ui ?? data?.ui)?.buttonAlign === 'left'}>
        {#if ($client?.user ?? data?.user)?.rank >= EUserRanks.Manager}
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

  <div class="flex flex-row text-sm pt-0.5">

    <button on:click={toggleViewMode}
            class="text-zinc-600 hover:bg-zinc-100 hover:text-sky-400 dark:text-zinc-300 dark:hover:bg-gray-500 dark:hover:text-zinc-200 rounded-md px-2 py-1 select-none transition-colors" >
      {#if listType === 'list'}
        <List /> 리스트로 보는 중
      {:else}
        <Gallery /> 갤러리로 보는 중
      {/if}
    </button>

  </div>


  {#if listType === 'list'}
    <ArticleList board={$page.params.id} list="{articles}" on:userclick={changeClickedUser} showingUserContextMenuIndex="{userContextMenuIndex}"/>
  {:else if listType === 'gallery'}
    <GalleryList board={$page.params.id} list="{articles}" on:userclick={changeClickedUser} showingUserContextMenuIndex="{userContextMenuIndex}"/>
  {:else}
    <p>정의되지 않음.</p>
  {/if}

  {#if ($client?.user ?? data?.user)}
    <div class="flex flex-row justify-end" class:flex-row-reverse={($client?.ui ?? data?.ui)?.buttonAlign === 'left'}>
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