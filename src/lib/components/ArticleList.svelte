<script lang="ts">
  import type {ArticleItemDto} from '$lib/types/dto/article-item.dto';
  import ko from 'date-fns/locale/ko';
  import format from 'date-fns/format';
  import formatDistanceToNow from 'date-fns/formatDistanceToNow';
  import {isEmpty} from 'lodash-es';

  export let board: string;
  export let list: ArticleItemDto[] = [];

  function formatDate(date: number) {
    const d = new Date(date);
    const now = Date.now();
    const diff = (now - d.getTime()) / 1000;
    if (diff < 60) {
      return '방금 전';
    }
    if (diff < 259200) {
      return formatDistanceToNow(d, {addSuffix: true, locale: ko});
    }

    return format(d, 'PPP EEE p', {locale: ko});
  }
</script>

<div class="w-full">
  {#if isEmpty(list)}
    <p class="w-full text-center text-zinc-500">게시글이 없습니다.</p>
  {/if}
  <ul>
    {#each list as article}
      <li class="flex space-x-16">
        <span class="text-zinc-500">{article._key}</span>
        <span class="flex-grow">
          <a class="hover:text-sky-400 transition-colors" href="/community/{board}/{article._key}">
            {article.title}
          </a>
        </span>
        <span>{formatDate(article.createdAt)}</span>
      </li>
    {/each}
  </ul>
</div>