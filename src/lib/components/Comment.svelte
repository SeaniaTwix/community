<script lang="ts">
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
  import Lock from 'svelte-material-icons/Lock.svelte';
  import Pub from 'svelte-material-icons/EyeCheck.svelte';
  import Private from 'svelte-material-icons/EyeOff.svelte';
  import Reply from 'svelte-material-icons/CommentMultiple.svelte';
  import Admin from 'svelte-material-icons/Settings.svelte';

  import {EUserRanks} from '$lib/types/user-ranks';
  import TimeAgo from 'javascript-time-ago';
  import {ko} from '$lib/time-ko';
  import {dayjs} from 'dayjs';
  import {createEventDispatcher, tick} from 'svelte';
  import ky from 'ky-universal';
  import Image from './Image.svelte';
  import {striptags} from 'striptags';
  import {session, page} from '$app/stores';
  import {isEmpty, last} from 'lodash-es';
  import {currentReply} from '$lib/community/comment/client';

  const dispatch = createEventDispatcher();
  let voting = false;

  TimeAgo.addLocale(ko as any);
  const timeAgo = new TimeAgo('ko-KR');

  function timeFullFormat(time: Date) {
    return dayjs(new Date(time)).format('YYYY년 M월 D일 HH시 m분');
  }

  function isOk(path: (HTMLElement | Window)[]) {
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

  function onReplyClicked(event: PointerEvent & {path: (HTMLElement | Window)[]}) {
    console.log(event);
    if (!isOk(event.path) ) {
      return;
    }

    currentReply.set(comment._key);
  }

  function onReportClicked(id: string) {
    dispatch('report', {
      id,
    });
  }

  function onEditClicked(id: string) {
    /*
    dispatch('edit', {
      id,
    }); // */
    editMode = true;
  }

  function onDeleteClicked(id: string) {
    dispatch('delete', {
      id,
    });
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
    if (!$session.user || voting || $session.user.uid === comment.author) {
      return;
    }

    voting = true;

    try {
      if (liked) {
        liked = false;
        return await vote('like', true);
      }

      liked = true;

      if (disliked) {
        disliked = false;
        await vote('dislike', true);
      }

      await vote('like', false);
    } finally {
      voting = false;
    }
  }

  async function dislike() {
    if (!$session.user || voting || $session.user.uid === comment.author) {
      return;
    }

    voting = true;

    try {
      if (disliked) {
        disliked = false;
        return await vote('dislike', true);
      }

      disliked = true;

      if (liked) {
        liked = false;
        await vote('like', true);
        await tick();
      }

      await vote('dislike', false);
    } finally {
      voting = false;
    }
  }

  async function confirmEdit() {
    // todo
  }

  function cancelEdit() {
    editMode = false;
  }

  let showInfo = false;
  export let level = 0;
  export let board: string;
  export let article: string;
  export let selected = false;
  export let users: Record<string, IUser>;
  export let comment: IComment;
  export let allComments: IComment[] = [];
  // $: replies = allComments.filter(c => c.relative === comment._key);
  let replies = allComments.filter(c => {
    return c.relative === comment._key
  });
  $: allReplies = allComments.filter(c => c.relative === comment._key);
  $: notFetchedReplyCounts = allReplies.length - replies.length;
  export let myVote: {like: boolean, dislike: boolean};
  export let isReplyMode = false;
  let liked = myVote?.like === true;
  let disliked = myVote?.dislike === true;
  $: likeCount = comment.votes?.like ?? 0;
  $: dislikeCount = comment.votes?.dislike ?? 0;
  let editMode = false;
  let content = striptags(comment.content);
  $: deleted = (<any>comment)?.deleted === true;
  // export let voted: 'like' | 'dislike' | undefined;
  // eslint-disable-next-line no-undef

  function getRelative(id: string): IComment | null {
    return allComments.find(c => c._key === id) ?? null;
  }

  function fetchAllReplies() {
    replies = [...allReplies];
  }

  function toImageSource(): IImage {
    let avatar = users[comment.author]?.avatar;
    if (!avatar) {
      avatar = 'https://s3.ru.hn/IMG_2775.GIF';
    }
    const type = last(avatar.split('.')).toLowerCase();
    return {src: avatar, type: `image/${type}`};
  }

  interface IImage {
    src: string
    type: string
  }
</script>

<div class="relative rounded-md shadow-md">
  {#if deleted}
    <div class="absolute min-h-[8rem] w-full -translate-y-1/2 top-1/2">
      <p class="text-center mt-12">이 댓글은 작성자나 관리자에 의해 삭제되었습니다.<span class="text-red-700 dark:text-red-500 cursor-pointer select-none ml-2 hover:underline">신고하기</span></p>
    </div>
  {/if}
  <div on:click={onReplyClicked}
       class:ring-2={selected}
       class:invisible={deleted}
       class="rounded-md p-2 min-h-[8rem] divide-y divide-dotted hover:ring-2 ring-offset-2 {selected ? 'ring-sky-400 dark:ring-sky-600' : 'ring-sky-400/50 dark:ring-sky-600/80'} dark:ring-offset-gray-600 bg-zinc-50/40 dark:bg-gray-700/30">
    <div class="space-y-4">
      <div class="flex justify-between ml-2" class:mb-3={!showInfo}>
        <div class="flex space-x-2 pt-1 flex-col md:flex-row lg:flex-row">
          <div prevent-reply class="flex space-x-2 hover:cursor-pointer group items-center">
            <div class="w-10 min-h-[2.5rem]">
              <CircleAvatar fallback="{toImageSource()}"/>
            </div>
            <span class="group-hover:text-sky-400">
              {users[comment.author]?.id ?? '[이름을 불러지 못 했습니다]'}
            </span>
          </div>
        </div>
        <div>
          <button data-tooltip-target="tooltip-comment-time-specific-{comment._key}" type="button">
            <time class="text-zinc-500 dark:text-zinc-300 text-sm">
              {timeAgo.format(new Date(comment.createdAt))}
            </time>
          </button>

          <div id="tooltip-comment-time-specific-{comment._key}" role="tooltip"
               class="inline-block absolute invisible z-10 py-2 px-3 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 transition-opacity duration-300 tooltip dark:bg-gray-700">
            작성 시간: {timeFullFormat(comment.createdAt)}
            <div class="tooltip-arrow" data-popper-arrow></div>
          </div>
        </div>
      </div>
      {#if showInfo}
        <div class="pb-4">
          유저 정보:
        </div>
      {/if}
    </div>
    <div class="flex flex-col justify-between px-2 pt-4"
         class:divide-y={!editMode} class:divide-dotted={!editMode}>
      <div class="flex-grow __comment-contents" prevent-reply="selection" class:pb-4={!editMode}>
        {#if comment.image}
          <div>
            <Image src="{comment.image}">
              <p>
                <img src="{comment.image}" alt="{comment.image}" />
              </p>
            </Image>
          </div>
        {/if}
        {#if !editMode}
          {#if comment.relative}
            {#if getRelative(comment.relative)}
              <a href="{$page.url.pathname}#c{comment.relative}" prevent-reply>
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
                해당 댓글이 삭제되었습니다.
              </div>
            {/if}
          {/if}
          {#each comment.content.split('\n') as line}
            <p class="p-1 __contents-line"><span prevent-reply>{@html line}</span></p>
          {/each}
        {:else}
        <textarea class="p-1 rounded-md bg-zinc-200 dark:bg-gray-500 w-full focus:outline-none"
                  bind:value={content}></textarea>

        {/if}
      </div>
      {#if $session.user}
        {#if !editMode}
          <div class="pt-2 flex justify-between select-none">
          <span class="space-x-2 flex-shrink-0">
            <span on:click|preventDefault={like} prevent-reply class:cursor-progress={voting}
                  class="text-sky-500 {$session.user.uid !== comment.author ? 'hover:text-sky-700' : 'cursor-not-allowed'}  cursor-pointer p-2 sm:p-0">
              {#if liked}
                <Like size="1rem" />
              {:else}
                <LikeEmpty size="1rem" />
              {/if}
              {likeCount}
            </span>
            <span on:click={dislike} prevent-reply class:cursor-progress={voting}
                  class="text-red-500 {$session.user.uid !== comment.author ? 'hover:text-red-700' : 'cursor-not-allowed'} cursor-pointer p-2 sm:p-0">
              {#if disliked}
                <Dislike size="1rem" />
              {:else}
                <DislikeEmpty size="1rem" />
              {/if}
              {dislikeCount}
            </span>
          </span>
            {#if !isReplyMode}
            <span class="inline-block flex-grow w-0 flex flex-row justify-end overflow-x-scroll space-x-2">
              {#if notFetchedReplyCounts > 0}
                <span class="cursor-pointer hover:text-sky-600 text-sm flex-grow-0 w-fit flex-shrink-0"
                      on:click={fetchAllReplies} prevent-reply>
                  새 댓글이 있습니다
                  <span class="relative text-base">
                    <Reply /> <span class="absolute text-xs bg-red-500 text-white rounded-md px-1 left-1/2 -top-0.5">{notFetchedReplyCounts}</span>
                  </span>
                </span>
              {/if}
              {#if $session?.user && $session.user.uid !== comment.author}
                <span class="cursor-pointer hover:text-red-600"
                      on:click={() => onReportClicked(comment._key)} prevent-reply>
                  <Report size="1rem"/>
                </span>
              {/if}
              {#if $session?.user?.uid === comment.author}
                <span class="cursor-pointer hover:text-sky-400"
                      on:click={() => onEditClicked(comment._key)} prevent-reply>
                  <Edit size="1rem"/>
                </span>
              {/if}
              {#if comment.author === $session.user?.uid || $session?.user?.rank >= EUserRanks.Manager}
                <span class="cursor-pointer hover:text-red-400"
                      on:click={() => onDeleteClicked(comment._key)} prevent-reply>
                  <Delete size="1rem"/>
                </span>
              {/if}

              {#if $session?.user?.rank >= EUserRanks.Manager}
                <span class="cursor-pointer hover:text-red-400"
                      on:click={() => onLockClicked(comment._key)} prevent-reply>
                  <Admin size="1rem"/>
                </span>
              {/if}
            </span>
            {/if}
          </div>
        {:else}
          <div class="flex space-x-2 w-full select-none">
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
</div>

{#if !isEmpty(replies) && !isReplyMode}
  <div id="r{comment._key}" class="{level === 0 ? 'ml-8 sm:ml-12' : ''}">
    <ol class="space-y-2 mt-2">
      {#each replies as reply}
        <li id="c{reply._key}">
          <svelte:self comment="{reply}"
                       level="{level + 1}"
                       {board}
                       {article}
                       myVote="{reply.myVote}"
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

  .__center-text {
    margin: 0;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
</style>