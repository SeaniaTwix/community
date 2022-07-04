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
      <li>
        <a class="flex justify-between space-x-4 py-4" href="/community/{board}/{article._key}">
          <span class="text-zinc-500 dark:text-zinc-400 hidden md:inline-block lg:inline-block">{article._key}</span>
          <div class="flex space-x-1 flex-grow flex-col md:flex-row lg:flex-row">
            <span class="flex justify-between">
              <span class="hover:text-sky-400 transition-colors inline-block" sveltekit:prefetch
                 >
                {article.title}
              </span>
              <!-- i have no idea to make no duplicated elements... -->
              <a class="cursor-pointer hover:text-sky-400 inline-block md:hidden lg:hidden
               underline decoration-dashed decoration-sky-400"
                 href="/user/profile/{article.author}">{users[article.author]?.id}</a>
            </span>
            <div class="flex flex-grow justify-between">
              <div class="inline-block select-none">
                {#if article?.comments}
                  <span>
                    <!--[{article.comments}]-->
                    <span class="mr-0.5"><Comment size="1rem" /></span>{article.comments}
                  </span>
                  {/if}
                  <span>
                    <span class="mr-0.5"><View size="1rem" /></span>{article.views ?? 0}
                  </span>
              </div>
              <div class="inline-block">
                <a class="cursor-pointer hover:text-sky-400 hidden sm:inline-block md:inline-block lg:inline-block
                          underline decoration-dashed decoration-sky-400"
                   href="/user/profile/{article.author}">{users[article.author]?.id}</a>
                <span class="text-right inline-block w-[6rem]">{formatDate(article.createdAt)}</span>
              </div>

            </div>
          </div>
        </a>
        {#if article.tags.length > 0}
          <div class="w-full px-2">
            <ul>
              {#each article.tags as tag}
                <li class="inline-block">
                  <Tag>{tag}</Tag>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</div>
