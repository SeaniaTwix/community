<script lang="ts">
  import type {ArticleItemDto} from '$lib/types/dto/article-item.dto';
  import TimeAgo from 'javascript-time-ago';
  import {isEmpty} from 'lodash-es';
  import {dayjs} from 'dayjs';
  import View from 'svelte-material-icons/Eye.svelte';
  import Comment from 'svelte-material-icons/Comment.svelte';
  import {ko} from '$lib/time-ko';
  import Tag from './Tag.svelte';
  import CircleAvatar from './CircleAvatar.svelte';
  import Like from 'svelte-material-icons/ThumbUp.svelte';
  import Dislike from 'svelte-material-icons/ThumbDown.svelte';
  import Image from 'svelte-material-icons/Image.svelte';
  import {session} from '$app/stores';
  import {EUserRanks} from '$lib/types/user-ranks';
  import {page} from '$app/stores';
  import {createEventDispatcher} from 'svelte';

  export let board: string;
  export let list: ArticleItemDto[] = [];
  export let showingUserContextMenuIndex = -1;
  $: console.log('changed:', showingUserContextMenuIndex);
  // export let users: Record<string, IUser>;
  const dispatch = createEventDispatcher();

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

    return dayjs(d).format('YY년 M월 D일');
  }

  function toImageSource(article: ArticleItemDto): IImage {
    const avatar = article.author?.avatar;
    if (!avatar) {
      // fallback
      return {
        src: 'https://s3.ru.hn/IMG_2775.GIF',
        type: 'image/gif',
      };
    }
    const type = avatar.split('.')[1];
    return {src: avatar, type,};
  }

  function toggleUserMenu(i: number) {
    dispatch('userclick', {already: showingUserContextMenuIndex === i, i});
  }

  interface IImage {
    src: string
    type: string
  }
</script>

<div class="w-full">
  {#if isEmpty(list)}
    <p class="w-full text-center text-zinc-500">게시글이 없습니다.</p>
  {/if}
  <ul class="divide-y divide-zinc-200 dark:divide-zinc-400">
    {#each list as article, i}
      <li class="px-2 py-3 hover:bg-zinc-100/30 group transition-colors">
        <a href="/community/{board}/{article._key}{$page.url.search}">
          <div class="flex justify-between">
            <span class="text-zinc-500 dark:text-zinc-400 hidden md:inline-block lg:inline-block mr-4 select-none">{article._key}</span>
            <div class="flex space-x-0 md:space-x-1 lg:space-x-1 flex-grow flex-col md:flex-row lg:flex-row w-full md:w-7/12 lg:w-5/12 min-w-0">
              <div class="flex justify-between min-w-0">
                <div class="hover:text-sky-400 transition-colors inline-block text-ellipsis overflow-hidden truncate">
                  {#if article.autoTag}
                    <a class="font-bold text-sky-400" href="/community/search?q=%23{article.autoTag}">{article.autoTag})</a>
                  {/if}<span>{typeof article.autoTag === 'string' ? article.title.replace(new RegExp('^' + article.autoTag + '.'), '') : article.title}</span>
                </div>
                <!-- i have no idea to make no duplicated elements... -->
                <div on:click|preventDefault={() => toggleUserMenu(i)} class="flex space-x-2 inline-block md:hidden lg:hidden ml-4">
                  <div class="w-6 max-h-6">
                    <CircleAvatar fallback="{toImageSource(article)}" border="sm"/>
                  </div>
                  <div class="cursor-pointer hover:text-sky-400
                          underline decoration-dashed decoration-sky-400 w-max max-w-[9rem] truncate">
                    <span>{article.author.id}</span>
                  </div>
                </div>
              </div>
              <div class="flex flex-grow flex-shrink-0 justify-between">
                <div class="inline-block select-none flex-shrink-0 justify-between space-x-1 mr-4 text-gray-700 dark:text-zinc-300">
                  <span class="inline-block md:hidden lg:hidden text-zinc-400 select-none">
                    {article._key}
                  </span>
                  {#if article.images}
                    <span>
                      <span class="mr-0.5"><Image size="1rem"/></span>
                    </span>
                  {/if}
                  {#if article?.comments}
                    <span>
                      <span class="mr-0.5"><Comment size="1rem"/></span>{article.comments}
                    </span>
                  {/if}
                  <span>
                    <span class="mr-0.5"><View size="1rem"/></span>{article.views ?? 0}
                  </span>
                  {#if Object.keys(article.tags).includes('_like')}
                    <span
                      class="text-sky-400 group-hover:text-sky-600 dark:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      <span class="mr-0.5"><Like size="1rem"/></span>{article.tags._like}
                    </span>
                  {/if}
                  {#if Object.keys(article.tags).includes('_dislike')}
                    <span
                      class="text-red-400 group-hover:text-red-600 dark:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      <span class="mr-0.5"><Dislike size="1rem"/></span>{article.tags._dislike}
                    </span>
                  {/if}
                </div>
                <div class="inline-block flex w-max">
                  <div on:click={() => toggleUserMenu(i)} class="flex space-x-2 hidden sm:hidden md:inline lg:inline flex-shrink-0">
                    <div class="w-6 max-h-6 inline-block mt-[-1px]">
                      <CircleAvatar fallback="{toImageSource(article)}" border="sm"/>
                    </div>
                    <div on:click|preventDefault class="cursor-pointer hover:text-sky-400 inline-block align-super
                              underline decoration-dashed decoration-sky-400">{article.author.id}</div>
                  </div>
                  <span class="text-right inline-block flex-shrink-0 min-w-[7rem]">
                    {formatDate(article.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </a>
        {#if showingUserContextMenuIndex === i}
          <div class="flex justify-end space-x-2 items-center overflow-x-scroll whitespace-nowrap">
            {#if $session && article.author.rank >= EUserRanks.Manager}
              <span>관리자이므로 차단할 수 없습니다.</span>
            {/if}
            <a href="/user/profile/{article.author._key}" class="bg-sky-400 hover:bg-sky-600 dark:bg-sky-800 dark:hover:bg-sky-600 text-white px-2 py-1 rounded-md text-center transition-colors">
              프로필 보기
            </a>
            {#if $session && $session.uid !== article.author && article.author.rank <= EUserRanks.User}
              <a href="/user/profile/edit/blocks/users?id={article.author}" class="text-center bg-red-400 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-500 text-white px-2 py-1 rounded-md">
                이 유저를 차단
              </a>
            {/if}
          </div>
        {/if}
        {#if Object.keys(article.tags).length > 0}
          <div class="w-full px-2">
            <ul class="space-x-1">
              {#each Object.keys(article.tags) as tagName}
                {#if !tagName.startsWith('_')}
                  <li class="inline-block">
                    <a href="/community/search?q=%23{decodeURIComponent(tagName)}">
                      <Tag count="{article.tags[tagName]}">{tagName}</Tag>
                    </a>
                  </li>
                {/if}
              {/each}
            </ul>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</div>
