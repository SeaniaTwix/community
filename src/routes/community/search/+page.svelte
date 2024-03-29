<script lang="ts">
  import {isEmpty} from 'lodash-es';
  import Tag from '$lib/components/Tag.svelte';
  import dayjs from 'dayjs';

  import type {PageData} from './$types';
  import ky from 'ky-universal';
  import type {SearchResponse} from 'meilisearch';
  import {page} from '$app/stores';
  import {onDestroy, onMount} from 'svelte';
  import {fade} from 'svelte/transition';
  import type {Unsubscriber} from 'svelte/store';
  import {beforeNavigate} from '$app/navigation';

  function timeFullFormat(time: Date) {
    return dayjs(new Date(time)).format('YYYY년 M월 D일 HH시 mm분');
  }

  export let data: PageData;
  let result = data.result;
  let q = data.q;

  let querySub: Unsubscriber;

  onMount(() => {
    querySub = page.subscribe(async (p) => {
      const current = p.url.searchParams.get('q');
      if (!isEmpty(q) && q !== current) {
        const {
          result: searchResult,
        } = await ky.get(`/community/api/search?q=${encodeURIComponent(current)}`).json<{ result: SearchResponse }>();
        result = searchResult.hits;
        // console.log(searchResult);
      }
      q = current;
    });
  });

  beforeNavigate(({from, to}) => {
    if (from?.url.pathname !== to?.url.pathname) {
      if (querySub) {
        querySub();
      }
    }
  });

  onDestroy(() => {
    if (querySub) {
      querySub();
    }
  });
</script>

<svelte:head>
  <title>루헨 - {q} 검색</title>
</svelte:head>

<div class="w-11/12 md:w-4/5 lg:w-3/4 mx-auto space-y-4 transition-transform __mobile-bottom-fix mt-2">
  <ul class="space-y-4">
    {#if !isEmpty(result)}
      {#each result as hit}
        <li transition:fade class="group">
          <a data-sveltekit-prefetch href="/community/{hit.board}/{hit.id}">
            <div class="rounded-md w-full shadow-md px-4 py-2 space-y-1 flex flex-col">

              <div class="flex flex-row justify-between items-center">
                <div class="flex-grow w-full">
                  <h2 class="text-xl group-hover:text-sky-400">{hit.title}</h2>
                </div>
                <div class="text-right flex flex-col justify-between">
                  <p class="w-max">작성자: {hit?.author?.name}</p>
                  <time class="pb-2 hidden sm:block w-max" datetime="{(new Date(hit.createdAt)).toUTCString()}">
                    작성일: {timeFullFormat(hit.createdAt)}</time>
                </div>
              </div>


              <div>
                <p>{hit.content.slice(0, 450)}
                  {#if hit.content.length > 450}...{/if}
                </p>

                {#if !isEmpty(hit.tags)}
                  <div class="py-2">
                    <ul class="space-x-2">
                      {#each Object.keys(hit.tags).filter(tagName => !tagName.startsWith('_')) as tagName}
                        <li class="inline-block">
                          <a href="/community/search?q={encodeURIComponent('#' + tagName)}">
                            <Tag count="{hit.tags[tagName]}">{tagName}</Tag>
                          </a>
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>

            </div>
          </a>

        </li>
      {/each}
    {:else}
      <li>
        <p class="text-zinc-600 text-center dark:text-zinc-200 text-xl mt-8">
          {#if isEmpty(q)}
            검색어를 입력해주세요
          {:else}
            '{q}'에 대한 검색 결과가 없습니다.
          {/if}
        </p>
      </li>
    {/if}
  </ul>
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
</style>
