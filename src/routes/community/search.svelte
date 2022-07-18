<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import {isEmpty} from 'lodash-es';

  export async function load({params, url, fetch}: LoadEvent): Promise<LoadOutput> {
    const q = url.searchParams.get('q') ?? '';

    if (isEmpty(q)) {
      return {
        status: 200,
        props: {
          result: [],
          q,
        },
      };
    }

    const response = await fetch(`/community/api/search?q=${encodeURIComponent(q)}`);
    const {result} = await response.json();

    return {
      status: 200,
      props: {
        result: result?.hits ?? [],
        q,
      },
    };
  }
</script>
<script lang="ts">
  import Tag from '$lib/components/Tag.svelte';

  import {dayjs} from 'dayjs';

  function timeFullFormat(time: Date) {
    return dayjs(new Date(time)).format('YYYY년 M월 D일 HH시 mm분');
  }

  export let result;
  export let q = '';
</script>

<div class="w-11/12 md:w-4/5 lg:w-3/4 mx-auto space-y-4 transition-transform __mobile-bottom-fix mt-2">
  <ul class="space-y-4">
    {#if !isEmpty(result)}
      {#each result as hit}
        <li class="group">
          <a sveltekit:prefetch href="/community/{hit.board}/{hit.id}">
            <div class="rounded-md w-full shadow-md px-4 py-2 space-y-1 flex flex-row justify-between">
              <div class="flex-grow w-full">
                <h2 class="text-xl group-hover:text-sky-400">{hit.title}</h2>
                <p>{hit.content}</p>

                {#if !isEmpty(hit.tags)}
                  <div class="py-2">
                    <ul class="space-x-2">
                      {#each Object.keys(hit.tags) as tagName}
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
              <div class="text-right flex flex-col justify-between">
                <p>작성자: {hit.author.name}</p>
                <time class="pb-2 invisible sm:visible w-max" datetime="{(new Date(hit.createdAt)).toUTCString()}">작성일: {timeFullFormat(hit.createdAt)}</time>
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
