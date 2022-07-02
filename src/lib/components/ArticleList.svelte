<script lang="ts">
  import type {ArticleItemDto} from '$lib/types/dto/article-item.dto';
  import TimeAgo from 'javascript-time-ago';
  // import ko from 'javascript-time-ago/locale/ko';
  import {isEmpty} from 'lodash-es';
  import {dayjs} from 'dayjs';
  import View from 'svelte-material-icons/Eye.svelte';
  import {ko} from '$lib/time-ko';
  import type {IUser} from '$lib/types/user';

  export let board: string;
  export let list: ArticleItemDto[] = [];
  export let users: IUser[] = [];

  TimeAgo.addLocale(ko);
  const timeAgo = new TimeAgo('ko-KR');

  function formatDate(date: number) {
    const d = new Date(date);
    const now = Date.now();
    const diff = (now - d.getTime()) / 1000;
    if (diff < 60) { // 1분 이내
      return '방금 전';
    }

    if (diff < 259200) { // 3일 이내
      return timeAgo.format(d);
    }

    return dayjs(d).format('YY년 M월 D일')
  }
</script>

<div class="w-full">
  {#if isEmpty(list)}
    <p class="w-full text-center text-zinc-500">게시글이 없습니다.</p>
  {/if}
  <ul class="divide-y">
    {#each list as article}
      <li class="py-3 space-y-1">
        <div class="flex space-x-4 justify-between">
        <span class="flex justify-between space-x-4">
          <span class="text-zinc-500 dark:text-zinc-400">{article._key}</span>
          <span class="flex justify-between flex-grow">
            <a class="hover:text-sky-400 transition-colors inline-block flex-grow pr-2" sveltekit:prefetch
               href="/community/{board}/{article._key}">
              {article.title}
            </a>
            <span class="select-none"><View size="1rem" /> {article.views}</span>
          </span>
        </span>
          <span class="flex justify-between w-3/12">
          <span class="cursor-pointer hover:text-sky-400">{users[article.author].id}</span>
          <span class="">{formatDate(article.createdAt)}</span>
        </span>
        </div>
        <div class="w-full px-2">
          <ul>
            {#each article.tags as tag}
              <li class="inline-block">
                <span class="rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-gray-700 px-2 py-1 flex justify-between space-x-1">
                  <span class="inline-block leading-5">{tag}</span>
                  <span class="__circle text-xs bg-sky-400 text-white inline w-4 h-4 text-center mt-0.5">2</span>
                </span>
              </li>
            {/each}
          </ul>
        </div>
      </li>
    {/each}
  </ul>
</div>

<style>
  .__circle {
    border-radius: 50%;
  }
</style>