<script lang="ts">
  import type {ArticleItemDto} from '$lib/types/dto/article-item.dto';
  import TimeAgo from 'javascript-time-ago';
  // import ko from 'javascript-time-ago/locale/ko';
  import {isEmpty} from 'lodash-es';
  import {dayjs} from 'dayjs';
  import View from 'svelte-material-icons/Eye.svelte';
  import Comment from 'svelte-material-icons/Comment.svelte';
  import {ko} from '$lib/time-ko';
  import type {IUser} from '$lib/types/user';
  import Tag from './Tag.svelte';

  export let board: string;
  export let list: ArticleItemDto[] = [];
  export let users: Record<string, IUser>;

  // console.log(users);

  TimeAgo.addLocale(ko as any);
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
          <span class="flex justify-between flex-grow space-x-1">
            <a class="hover:text-sky-400 transition-colors inline-block flex-grow" sveltekit:prefetch
               href="/community/{board}/{article._key}">
              {article.title}
            </a>
            {#if article?.comments}
                <span class="mt-[3px] leading-none">
                  <!--[{article.comments}]-->
                  <span class="mr-0.5"><Comment size="1rem" /></span>{article.comments}
                </span>
              {/if}
            <span class="select-none">
              <span class="mr-0.5"><View size="1rem" /></span>{article.views}
            </span>
          </span>
        </span>
          <span class="flex justify-between w-3/12">
          <a class="cursor-pointer hover:text-sky-400" href="/user/profile/{article.author}">{users[article.author]?.id}</a>
          <span class="">{formatDate(article.createdAt)}</span>
        </span>
        </div>
        <div class="w-full px-2">
          <ul>
            {#each article.tags as tag}
              <li class="inline-block">
                <Tag>{tag}</Tag>
              </li>
            {/each}
          </ul>
        </div>
      </li>
    {/each}
  </ul>
</div>
