<script lang="ts">
  import type {ArticleItemDto} from '$lib/types/dto/article-item.dto';
  import TimeAgo from 'javascript-time-ago';
  import ko from 'javascript-time-ago/locale/ko';
  import {isEmpty} from 'lodash-es';
  import {dayjs} from 'dayjs';
  import View from 'svelte-material-icons/Eye.svelte';

  export let board: string;
  export let list: ArticleItemDto[] = [];

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
      <li class="flex space-x-16 py-1">
        <span class="text-zinc-500">{article._key}</span>
        <span class="flex-grow">
          <a class="hover:text-sky-400 transition-colors" href="/community/{board}/{article._key}">
            {article.title}
          </a>
        </span>
        <span class="select-none"><View size="1rem" /> {article.views}</span>
        <span>{formatDate(article.createdAt)}</span>
      </li>
    {/each}
  </ul>
</div>