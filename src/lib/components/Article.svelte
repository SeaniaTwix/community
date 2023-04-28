<script lang="ts">
  import '@root/styles/time-tooltip.css';

  import View from 'svelte-material-icons/Eye.svelte';
  import Plus from 'svelte-material-icons/Plus.svelte';
  import Edit from 'svelte-material-icons/Pencil.svelte';
  import Delete from 'svelte-material-icons/TrashCan.svelte';
  import Report from 'svelte-material-icons/AlertBox.svelte';
  import Admin from 'svelte-material-icons/Cog.svelte';
  import Like from 'svelte-material-icons/ThumbUp.svelte';
  import LikeEmpty from 'svelte-material-icons/ThumbUpOutline.svelte';
  import Dislike from 'svelte-material-icons/ThumbDown.svelte';
  import DislikeEmpty from 'svelte-material-icons/ThumbDownOutline.svelte';
  import RemoveTag from 'svelte-material-icons/Close.svelte';

  import {goto} from '$app/navigation';
  import TimeAgo from 'javascript-time-ago';
  import dayjs from 'dayjs';
  import CircleAvatar from './CircleAvatar.svelte';
  import Content from './Content.svelte';
  import Tag from './Tag.svelte';
  import type {IArticle} from '$lib/types/article';
  import type {IUser} from '$lib/types/user';
  import type {ITag} from '$lib/types/tag';
  import {EUserRanks} from '$lib/types/user-ranks';
  import {ko} from '$lib/time-ko';
  import ky from 'ky-universal';
  import HttpStatus from 'http-status-codes';
  import Novel from './Novel.svelte';
  import {afterUpdate} from 'svelte';
  import {isEmpty} from 'lodash-es';
  import type {PageData} from '@routes/community/[id=integer]/[article=integer]/$types';
  import {client} from '$lib/auth/user/client';

  export let data: PageData;

  export let article: IArticle<Record<string, Record<string, ITag>>, IUser>;
  export let users: Record<string, IUser>;
  export let contents: string;
  export let isAdult = false;

  $: tags = Object.keys(article.tags).filter(tag => !tag.startsWith('_'));

  let tagInputMode = false;
  let tagInput: HTMLInputElement;
  let tagText = '';

  // user added in client
  let addedTags: string[] = [];

  $: leftTagCount = Math.max(0, 20 - tags.length);

  afterUpdate(() => {
    if (tagInput) {
      tagInput.focus();
    }
  });

  // noinspection TypeScriptUnresolvedFunction
  let liked = (<string[]>article?.myTags)?.includes('_like');
  // noinspection TypeScriptUnresolvedFunction
  let disliked = (<string[]>article?.myTags)?.includes('_dislike');
  $: likeCount = article?.tags?._like ?? 0;
  $: dislikeCount = article?.tags?._dislike ?? 0;

  TimeAgo.addLocale(ko as any);
  const timeAgo = new TimeAgo('ko-KR');

  function timeFullFormat(time: Date | number) {
    const day = dayjs(new Date(time));
    const a = day.format('a') === 'am' ? '오전' : '오후';
    return day.format(`YYYY년 M월 D일 ${a} hh시 m분`);
  }

  function toImageSource(uid: string): IImage {
    // @ts-ignore
    let avatar = users?.[uid]?.avatar;
    if (!avatar) {
      // @ts-ignore
      avatar = article.author?.avatar;
    }
    if (!avatar) {
      // fallback
      avatar = 'https://s3.ru.hn/IMG_2775.GIF';
    }
    const type = avatar.split('.')[1];
    return {src: avatar, type,};
  }

  function isMyTag(tagName: string): boolean {
    // console.log(tagName, article.myTags)
    // noinspection TypeScriptUnresolvedFunction
    return (<string[]>article.myTags)?.includes(tagName) || addedTags.includes(tagName);
  }

  function fineTags(tagsLiteral: string) {
    return tagsLiteral.includes(',')
      ? tagsLiteral.split(',').map(v => v.trim()).join(',') : tagsLiteral.trim();
  }

  async function addTag(tagsLiteral: string) {
    if (isEmpty(tagsLiteral)) {
      return;
    }
    const t = fineTags(tagsLiteral);
    return await ky
      .put(`/community/${article.board}/${article._key}/api/tag/add?name=${t}`)
      .json();
  }

  async function removeTag(tags: string) {
    const t = tags.includes(',')
      ? tags.split(',').map(v => v.trim()).join(',') : tags.trim();
    return await ky
      .delete(`/community/${article.board}/${article._key}/api/tag/remove?name=${t}`)
      .json();
  }

  async function vote(type: 'like' | 'dislike') {
    if (type === 'like') {
      if (liked) {
        liked = false;
        return removeTag('_like');
      } else if (disliked) {
        disliked = false;
        await removeTag('_dislike');
      }
      if ($client?.user?.uid !== article.author._key) {
        liked = true;
        return await addTag('_like');
      }
    } else { // vote dislike
      if (disliked) {
        disliked = false;
        return removeTag('_dislike');
      } else if (liked) {
        liked = false;
        await removeTag('_like');
      }
      // noinspection TypeScriptUnresolvedVariable
      if ($client?.user?.uid !== article.author._key) {
        disliked = true;
        return await addTag('_dislike');
      }
    }
  }

  async function deleteArticle() {
    const res = await ky.delete(`/community/${article.board}/${article._key}/api/delete`);
    if (res.status === HttpStatus.ACCEPTED) {
      goto(`/community/${article.board}${location.search}`).then();
    }
  }

  function enableTagInput() {
    if (!$client.user) {
      return;
    }

    if (article.author._key === $client.user.uid) {
      if (Object.keys(article.tags).length >= 30) {
        // todo: error message
        return;
      }
    } else {
      if (Object.keys(article.tags).length >= 20) {
        // todo: error message
        return;
      }
    }

    tagInputMode = true;
  }

  function detectEnterInTagInput(event: KeyboardEvent) {
    if (event.isComposing || event.keyCode === 229) {
      return;
    }
    if (event.key === 'Enter') {
      const myTags: string[] = (<string[]>article.myTags);
      const t = fineTags(tagText);
      const todoAdd = t.split(',').filter(current => !myTags.includes(current));

      const expectedTagCount = Object.keys(article.tags).length + todoAdd.length;

      if (article.author._key === $client.user?.uid) {
        if (expectedTagCount >= 30) {
          // todo: error message
          return;
        }
      } else {
        if (expectedTagCount >= 20) {
          // todo: error message
          return;
        }
      }

      addedTags = [...addedTags, ...todoAdd];

      addTag(tagText)
        .then(() => {
          tagText = '';
        })
        .catch(() => {
          // todo: add show failed tag and retry
          addedTags = addedTags.filter(tag => !todoAdd.includes(tag));
        });
    }
  }

  interface IImage {
    src: string
    type: string
  }
</script>
<div class="w-full sm:w-5/6 md:w-4/5 lg:w-3/5 mx-auto p-2 rounded-md shadow-none sm:shadow-md transition-transform divide-y divide-dotted">
  <div class="space-y-2 mb-4">
    <div class="flex justify-between">
      <div class="flex space-x-2 flex-col md:flex-row lg:flex-row min-w-0">
        <h2 class="text-2xl flex-shrink after:bg-rose-500 after:text-white after:inline-block after:w-5 after:reading-zero after:pl-[3px] after:ml-1 after:text-sm" class:__warning-adult-content={isAdult}>
          {article.title}
        </h2>
        <div class="inline-block flex space-x-2 pr-4">
          {#if ($client?.user ?? data?.user)}
            <div class="w-max py-2 md:py-0.5">
              {#if ($client?.user ?? data?.user)?.uid !== article.author._key}
                <button class="mt-0.5 cursor-pointer hover:text-red-600">
                  <Report size="1rem"/>
                </button>
              {/if}
              {#if article.author._key === ($client?.user ?? data?.user)?.uid}
                <a role="button" aria-label="이 게시글 수정" href="/community/{article.board}/{article._key}/edit"
                   class="inline-block mt-0.5 cursor-pointer hover:text-sky-400">
                  <Edit size="1rem"/>
                </a>
              {/if}
              {#if article.author._key === ($client?.user ?? data?.user)?.uid || ($client?.user ?? data?.user)?.rank >= EUserRanks.Manager}
                <button on:click={deleteArticle} class="mt-0.5 cursor-pointer hover:text-red-400">
                  <Delete size="1rem"/>
                </button>
              {/if}
              {#if ($client?.user ?? data?.user)?.rank >= EUserRanks.Manager}
                <a role="button" aria-label="관리" href="/community/{article.board}/{article._key}/manage" class="mt-0.5 cursor-pointer hover:text-red-400">
                  <Admin size="1rem"/>
                </a>
              {/if}
            </div>
          {/if}
        </div>
      </div>
      <div class="flex flex-col md:flex-col">
        <span class="w-max"><View size="1rem"/> {article.views ?? 1}</span>

        <div class="__time-tooltip before:bg-zinc-200 dark:before:bg-gray-700 dark:before:text-white" time="작성 시간: {timeFullFormat(article.createdAt)}">
          <button class="w-full text-right" data-tooltip-target="tooltip-time-specific" type="button">
            <time class="text-zinc-500 dark:text-zinc-300 text-sm" datetime="{(new Date(article.createdAt)).toUTCString()}">
              {timeAgo.format(new Date(article.createdAt))}
            </time>
          </button>
        </div>
      </div>
    </div>
    <div class="flex space-x-3 items-center">
      <div class="w-12 h-12 inline-block">
        <CircleAvatar fallback="{toImageSource(article.author._key)}"/>
      </div>
      <span class="inline-block leading-none hover:text-sky-400">{article.author?.id}</span>
    </div>
  </div>
  {#if article.source}
    <div class="rounded-sm overflow-hidden">
      <p class="px-4 py-2 border-l-2 border-sky-400 select-none dark:bg-zinc-600">
        출처 <a class="text-sky-300 hover:text-sky-400 transition-colors select-text"
               href="{article.source}">{article.source}</a>
      </p>
    </div>
  {/if}
  <article class="pt-4 pb-2 min-h-[10rem]">
    {#if Object.keys(article.tags).includes('소설')}
      <Novel {contents} />
    {:else}
      <Content {contents} nsfw="{!!article.tags['후방']}"/>
    {/if}
  </article>
  <div class="pt-3">
    <ul class="space-x-2 flex flex-wrap">
      {#if ($client?.user ?? data?.user)}
        <li on:click={() => vote('like')}
            class:cursor-not-allowed={($client?.user ?? data?.user)?.uid === article.author._key}
            class:cursor-pointer={($client?.user ?? data?.user)?.uid !== article.author._key}
            class="inline-block text-sky-400 hover:text-sky-600 mb-2" reserved>
          <Tag>
            {#if liked}
              <Like size="1rem"/>
            {:else}
              <LikeEmpty size="1rem"/>
            {/if}
            {likeCount}
          </Tag>
        </li>
        <li on:click={() => vote('dislike')}
            class:cursor-not-allowed={($client?.user ?? data?.user)?.uid === article.author._key}
            class:cursor-pointer={($client?.user ?? data?.user)?.uid !== article.author._key}
            class="inline-block text-red-400 hover:text-red-600 mb-2" reserved>
          <Tag>
            {#if disliked}
              <Dislike size="1rem"/>
            {:else}
              <DislikeEmpty size="1rem"/>
            {/if}
            {dislikeCount}
          </Tag>
        </li>
      {:else}
        <li class="inline-block text-sky-400 mb-2 cursor-default">
          <Tag disabled="{true}">
            <LikeEmpty size="1rem"/> {likeCount}
          </Tag>
        </li>
        <li class="inline-block text-red-400 mb-2 cursor-default">
          <Tag disabled="{true}">
            <DislikeEmpty size="1rem"/> {dislikeCount}
          </Tag>
        </li>
      {/if}
      {#each tags as tagName}
        <li class="inline-block mb-2 cursor-pointer">
          <Tag count="{article.tags[tagName]}">{tagName}
            {#if isMyTag(tagName)}<span class="text-gray-600 dark:text-gray-400 leading-none __icon-fix"><RemoveTag
              size="1rem"/></span>{/if}
          </Tag>
        </li>
      {/each}

      {#if ($client?.user ?? data?.user)}
        <li class="inline-block mb-2 cursor-pointer relative w-fit">
          <Tag>
            {#if tagInputMode}
              <input bind:this={tagInput}
                     bind:value={tagText}
                     on:keydown={detectEnterInTagInput}
                     type="text"
                     class="bg-transparent outline-none min-w-[12rem]"
                     placeholder="최대 {leftTagCount}개의 태그 등록 가능"/>
            {:else}
              <span on:click={enableTagInput}>
                <Plus size="1rem"/>
                <span>새 태그 추가 ({leftTagCount})</span>
              </span>
            {/if}
          </Tag>
        </li>
      {/if}
    </ul>
  </div>
</div>

<style lang="scss">
  .__warning-adult-content {
    &:after {
      content: "19";
      border-radius: 50%;
      aspect-ratio: 1/1;
    }
  }
</style>