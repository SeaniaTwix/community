<script lang="ts">
  import '@root/styles/time-tooltip.css';
  import CircleAvatar from '$lib/components/CircleAvatar.svelte';
  import type {IComment} from '$lib/types/comment';
  import type {IUser} from '$lib/types/user';

  import Edit from 'svelte-material-icons/Pencil.svelte';
  import Delete from 'svelte-material-icons/TrashCan.svelte';
  import Report from 'svelte-material-icons/AlertBox.svelte';
  import Like from 'svelte-material-icons/ThumbUp.svelte';
  import LikeEmpty from 'svelte-material-icons/ThumbUpOutline.svelte';
  import Dislike from 'svelte-material-icons/ThumbDown.svelte';
  import DislikeEmpty from 'svelte-material-icons/ThumbDownOutline.svelte';
  import Reply from 'svelte-material-icons/CommentMultiple.svelte';
  import Admin from 'svelte-material-icons/Settings.svelte';

  import {EUserRanks} from '$lib/types/user-ranks';
  import TimeAgo from 'javascript-time-ago';
  import {ko} from '$lib/time-ko';
  import dayjs from 'dayjs';
  import {afterUpdate, createEventDispatcher, tick} from 'svelte';
  import ky from 'ky-universal';
  import Image from './Image.svelte';
  import {striptags} from 'striptags';
  import {page} from '$app/stores';
  import {isEmpty, last} from 'lodash-es';
  import {
    currentReply,
    deletedComment,
    highlighed,
  } from '$lib/community/comment/client';
  import {toSources} from '$lib/file/image/shared';
  import {client} from '$lib/auth/user/client';
  import type {PageData} from '@routes/community/[id=integer]/[article=integer]/$types';

  const dispatch = createEventDispatcher();
  let voting = false;

  TimeAgo.addLocale(ko as any);
  const timeAgo = new TimeAgo('ko-KR');

  function timeFullFormat(time: Date) {
    return dayjs(new Date(time)).format('YYYY년 M월 D일 HH시 m분');
  }

  function isOk(path: EventTarget[]) {
    if (isReplyMode || isEmpty(path)) {
      return false;
    }

    const selection = window.getSelection();

    if (selection.toString().length > 0) {
      return false;
    }

    const noEventFireExists = path.find(
      element => {
        if (element instanceof HTMLElement) {
          // only allowed empty (it mean always)
          const pr: Attr | undefined = element.attributes['prevent-reply'];
          return pr && pr.nodeValue.length <= 0;
        }
        return false;
      });

    console.trace('isOk:', !noEventFireExists, noEventFireExists);

    return !noEventFireExists;
  }

  function onReplyClicked(event: PointerEvent) {
    if (!$client.user || !isOk(event.composedPath())) {
      return;
    }
    $highlighed = undefined;
    currentReply.set(comment._key);
  }

  function onReportClicked(id: string) {
    dispatch('report', {
      id,
    });
  }

  async function onEditClicked(id: string) {
    /*
    dispatch('edit', {
      id,
    }); // */
    editMode = true;
    await tick();
    editTextInput.focus();
  }

  function onDeleteClicked(id: string) {
    /*dispatch('delete', {
      id,
    });*/
    deletedComment.set(id);
  }

  function onLockClicked(id: string) {
    dispatch('lock', {
      id,
    });
  }

  async function vote(type: 'like' | 'dislike', withdrawal: boolean) {
    const r = withdrawal ? ky.delete : ky.put;

    await r(`/community/${board}/${article}/comments/${comment._key}/api/vote?type=${type}`);
  }

  async function like() {
    if (!$client.user || voting || $client.user.uid === comment.author) {
      return;
    }

    voting = true;

    try {
      if (comment.myVote!.like) {
        comment.myVote!.like = false;
        return await vote('like', true);
      }

      comment.myVote!.like = true;

      if (comment.myVote!.dislike) {
        comment.myVote!.dislike = false;
        await vote('dislike', true);
      }

      await vote('like', false);
    } finally {
      voting = false;
    }
  }

  async function dislike() {
    if (!$client.user || voting || $client.user.uid === comment.author) {
      return;
    }

    voting = true;

    try {
      if (comment.myVote!.dislike) {
        comment.myVote!.dislike = false;
        return await vote('dislike', true);
      }

      comment.myVote!.dislike = true;

      if (comment.myVote!.like) {
        comment.myVote!.like = false;
        await vote('like', true);
        await tick();
      }

      await vote('dislike', false);
    } finally {
      voting = false;
    }
  }

  async function confirmEdit() {
    const {newContent} = await ky.patch(`/community/${board}/${article}/comments/${comment._key}/api/manage`, {
      json: {
        content,
      }
    }).json();
    comment.content = newContent;
    content = striptags(newContent);
    cancelEdit();
  }

  function cancelEdit() {
    editMode = false;
  }

  let showInfo = false;
  export let data: PageData;
  export let level = 0;
  export let board: string;
  export let article: string;
  export let selected = false;
  export let users: Record<string, IUser>;
  export let comment: IComment<IUser>;
  export let allComments: IComment[] = [];
  export let isReplyMode = false;
  export let deleted = comment?.deleted === true;
  export let isBest = false;
  // $: replies = allComments.filter(c => c.relative === comment._key);
  let replies = allComments.filter(c => {
    return c.relative === comment._key
  });
  $: allReplies = allComments.filter(c => c.relative === comment._key);
  $: notFetchedReplyCounts = allReplies.length - replies.length;
  $: myVote = allComments.find(c => c._key === comment._key).myVote;
  $: likeCount = allComments.find(c => c._key === comment._key).votes?.like ?? 0;
  $: dislikeCount = allComments.find(c => c._key === comment._key).votes?.dislike ?? 0;
  let editMode = false;
  let content = striptags(comment?.content ?? '');
  let editTextInput: HTMLTextAreaElement;
  // let deleted = (<any>comment)?.deleted === true;
  // export let voted: 'like' | 'dislike' | undefined;
  // eslint-disable-next-line no-undef

  afterUpdate(() => {
    fetchAllRepliesMine();
  })

  // if you commented, fetch all replies
  function fetchAllRepliesMine() {
    const notFetched: IComment[] = allReplies?.filter(c => !replies.find(r => r._key === c._key)) ?? [];
    if (notFetchedReplyCounts > 0 && notFetched.find(c => c.author === $client?.user?.uid)) {
      fetchAllReplies();
    }
  }

  function getRelative(id: string): IComment | null {
    return allComments.find(c => c._key === id) ?? null;
  }

  function fetchAllReplies() {
    replies = [...allReplies];
  }

  function toImageSource(): IImage {
    let avatar = comment.author?.avatar ?? 'https://s3.ru.hn/IMG_2775.GIF';
    const type = last(avatar.split('.')).toLowerCase();
    return {src: avatar, type: `image/${type}`};
  }

  function detectDirectSend(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      confirmEdit();
      return;
    }
  }

  function highlightComment(id: string) {
    $highlighed = id;
  }

  interface IImage {
    src: string
    type: string
  }
</script>

<div class="relative rounded-md shadow-md bg-zinc-50/40 dark:bg-gray-700/30">
  {#if deleted}
    <div class="min-h-[8rem] w-full flex flex-col justify-center" prevent-reply>
      <p class="text-center">이 댓글은 삭제되었습니다.<span class="text-red-700 dark:text-red-500 cursor-pointer select-none ml-2 hover:underline">신고하기</span></p>
    </div>
  {:else}
    {#if comment.deleted}
      <div class="absolute min-h-[8rem] w-full -translate-y-1/2 top-1/2">
        <p class="text-center mt-12">이 댓글은 작성자나 관리자에 의해 삭제되었습니다.<span class="text-red-700 dark:text-red-500 cursor-pointer select-none ml-2 hover:underline">신고하기</span></p>
      </div>
    {/if}
    <div on:click={onReplyClicked}
         class:ring-2={selected}
         class:outline={$highlighed === comment._key}
         class:invisible={comment.deleted}
         class="rounded-md p-2 min-h-[8rem] divide-y divide-dotted hover:ring-2 outline-amber-400 ring-offset-2 {selected ? 'ring-sky-400 dark:ring-sky-600' : 'ring-sky-400/50 dark:ring-sky-600/80'} dark:ring-offset-gray-600">
      <div class="space-y-4">
        <div class="flex justify-between items-center ml-2" class:mb-3={!showInfo}>
          <div class="flex space-x-2 pt-1 flex-col md:flex-row lg:flex-row">
            <div prevent-reply class="flex space-x-2 hover:cursor-pointer group items-center">

              <div class="w-10 h-10">
                <CircleAvatar fallback="{toImageSource()}"/>
              </div>
              <span class="group-hover:text-sky-400">
                {comment.author?.id ?? '[이름을 불러지 못 했습니다]'}
              </span>

              {#if isBest}
                <div class="select-none px-1">
                  <span class="bg-sky-400 text-white px-1.5 py-1 rounded-md text-sm">베스트</span>
                </div>
              {/if}
            </div>
          </div>

          <div class="__time-tooltip" time="작성 시간: {timeFullFormat(comment.createdAt)}">
            <button class="w-full text-right" data-tooltip-target="tooltip-time-specific" type="button">
              <time class="text-zinc-500 dark:text-zinc-300 text-sm" datetime="{(new Date(comment.createdAt)).toUTCString()}">
                {timeAgo.format(new Date(comment.createdAt))}
              </time>
            </button>
          </div>
        </div>
        {#if showInfo}
          <div class="pb-4">
            유저 정보:
          </div>
        {/if}
      </div>
      <div class="flex flex-col justify-between px-2 pt-2"
           class:divide-y={!editMode} class:divide-dotted={!editMode}>
        <div class="flex-grow __comment-contents space-y-2" prevent-reply="selection" class:pb-2={!editMode}>
          {#if comment.relative}
            {#if getRelative(comment.relative) && !getRelative(comment.relative).deleted}
              <a on:click={() => highlightComment(comment.relative)} href="{$page.url.pathname}#c{comment.relative}" prevent-reply>
                <div>
                  <div class="flex flex-row text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-200 dark:bg-gray-600 px-2 py-1 rounded-md space-x-1">
                    <span class="w-max after:content-[':']">{users[getRelative(comment.relative).author].id}</span>
                    <p class="flex-grow w-0 truncate">
                      {getRelative(comment.relative).content}
                    </p>
                  </div>
                </div>
              </a>
            {:else}
              <div class="flex flex-row text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-200 dark:bg-gray-600 px-2 py-1 rounded-md space-x-1">
                {#if getRelative(comment.relative).author}
                  <span class="w-max after:content-[':'] mr-1">{users[getRelative(comment.relative).author]?.id}</span>
                {/if} <i>[댓글이 삭제되었습니다.]</i>
              </div>
            {/if}
          {/if}
          {#if comment.image}
            <div>
              <Image {data} src="{comment.image}" size="{comment.imageSize}" sources="{toSources(comment.images)}" />
            </div>
          {/if}
          {#if !editMode}
            {#if !isEmpty(comment.content.trim())}
              {#each comment.content.split('\n') as line}
                <p class="p-1 __contents-line"><span prevent-reply>{@html line}</span></p>
              {/each}
            {/if}
          {:else}
            <textarea prevent-reply
                      class="p-1 rounded-md bg-zinc-200 dark:bg-gray-500 w-full focus:outline-none"
                      on:keydown={detectDirectSend}
                      bind:this={editTextInput}
                      bind:value={content}></textarea>

          {/if}
        </div>
        {#if $client?.user ?? data?.user}
          {#if !editMode}
            <div class="pt-2 flex justify-between select-none">
          <span class="space-x-2 flex-shrink-0">
            <span on:click|preventDefault={like} prevent-reply class:cursor-progress={voting}
                  class="text-sky-500 {($client?.user ?? data?.user)?.uid !== comment.author._key ? 'hover:text-sky-700' : 'cursor-not-allowed'} cursor-pointer p-2 sm:p-0">
              {#if comment.myVote.like}
                <Like size="1rem" />
              {:else}
                <LikeEmpty size="1rem" />
              {/if}
              {likeCount}
            </span>
            <span on:click={dislike} prevent-reply class:cursor-progress={voting}
                  class="text-red-500 {($client?.user ?? data?.user)?.uid !== comment.author._key ? 'hover:text-red-700' : 'cursor-not-allowed'} cursor-pointer p-2 sm:p-0">
              {#if comment.myVote.dislike}
                <Dislike size="1rem" />
              {:else}
                <DislikeEmpty size="1rem" />
              {/if}
              {dislikeCount}
            </span>
          </span>
            {#if !isReplyMode}
            <span class="__no-scrollbar inline-block flex-grow w-0 flex flex-row justify-end overflow-x-scroll space-x-2">
              {#if notFetchedReplyCounts > 0}
                <span class="cursor-pointer hover:text-sky-600 text-sm flex-grow-0 w-fit flex-shrink-0"
                      on:click={fetchAllReplies} prevent-reply>
                  새 댓글이 있습니다
                  <span class="relative text-base">
                    <Reply /> <span class="absolute text-xs bg-red-500 text-white rounded-md px-1 left-1/2 -top-0.5">{notFetchedReplyCounts}</span>
                  </span>
                </span>
              {/if}
              {#if ($client?.user ?? data?.user) && ($client?.user ?? data?.user)?.uid !== comment.author._key}
                <span class="cursor-pointer hover:text-red-600"
                      on:click={() => onReportClicked(comment._key)} prevent-reply>
                  <Report size="1rem"/>
                </span>
              {/if}
              {#if ($client?.user ?? data?.user)?.uid === comment.author._key}
                <span class="cursor-pointer hover:text-sky-400"
                      on:click={() => onEditClicked(comment._key)} prevent-reply>
                  <Edit size="1rem"/>
                </span>
              {/if}
              {#if ($client?.user ?? data?.user)?.uid === comment.author._key || ($client?.user ?? data?.user)?.rank >= EUserRanks.Manager}
                <span class="cursor-pointer hover:text-red-400"
                      on:click={() => onDeleteClicked(comment._key)} prevent-reply>
                  <Delete size="1rem"/>
                </span>
              {/if}

              {#if ($client?.user ?? data?.user)?.rank >= EUserRanks.Manager}
                <span class="cursor-pointer hover:text-red-400"
                      on:click={() => onLockClicked(comment._key)} prevent-reply>
                  <Admin size="1rem"/>
                </span>
              {/if}
              </span>
              {/if}
            </div>
          {:else}
            <div class="flex space-x-2 w-full select-none" prevent-reply>
              <button on:click={confirmEdit} prevent-reply class="bg-sky-400 text-white dark:bg-sky-700 rounded-md py-2 w-full shadow-md">
                수정 완료
              </button>
              <button on:click={cancelEdit} prevent-reply class="bg-red-400 text-white dark:bg-red-700 rounded-md py-2 w-full shadow-md">
                취소
              </button>
            </div>
          {/if}
        {:else}
          <span class="space-x-2 pt-2 select-none">
            <span class="text-sky-500 cursor-default p-2 sm:p-0">
              <LikeEmpty size="1rem" /> {likeCount}
            </span>
            <span class="text-red-500 cursor-default p-2 sm:p-0">
              <DislikeEmpty size="1rem" /> {dislikeCount}
            </span>
          </span>
        {/if}
      </div>
    </div>
  {/if}
</div>

{#if !isEmpty(replies) && !isReplyMode && !isBest}
  <div id="r{comment._key}" class="{level === 0 ? 'ml-8 sm:ml-12' : ''}">
    <ol class="space-y-2 mt-2">
      {#each replies as reply}
        <li id="c{reply._key}">
          <svelte:self comment="{reply}"
                       level="{level + 1}"
                       {board}
                       {article}
                       bind:users={users} bind:allComments={allComments} />
        </li>
      {/each}
    </ol>
  </div>
{/if}

<style lang="scss">
  :global {
    .__contents-line {
      p {
        display: inline-block;
      }

      span, a {
        overflow-wrap: break-word;
      }
    }
  }

  .__no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  .__center-text {
    margin: 0;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
</style>