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
  import Messages from 'svelte-material-icons/Message.svelte';
  import Admin from 'svelte-material-icons/Settings.svelte';

  import {EUserRanks} from '$lib/types/user-ranks';
  import TimeAgo from 'javascript-time-ago';
  import {ko} from '$lib/time-ko';
  import {dayjs} from 'dayjs';
  import {createEventDispatcher, tick} from 'svelte';
  import ky from 'ky-universal';
  import Image from './Image.svelte';
  import {striptags} from 'striptags';

  const dispatch = createEventDispatcher();
  let voting = false;

  TimeAgo.addLocale(ko as any);
  const timeAgo = new TimeAgo('ko-KR');

  function timeFullFormat(time: Date) {
    return dayjs(new Date(time)).format('YYYY년 M월 D일 HH시 m분');
  }

  function onReplyClicked(id: string) {
    dispatch('reply', {
      id,
    });
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
    if (!session || voting || session.uid === comment.author) {
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
    if (!session || voting || session.uid === comment.author) {
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

  }

  function cancelEdit() {
    editMode = false;
  }

  let showInfo = false;
  export let board: string;
  export let article: string;
  export let selected = false;
  export let user: IUser;
  export let comment: IComment;
  export let myVote: {like: boolean, dislike: boolean};
  let liked = myVote?.like === true;
  let disliked = myVote?.dislike === true;
  $: likeCount = comment.votes?.like ?? 0;
  $: dislikeCount = comment.votes?.dislike ?? 0;
  let editMode = false;
  let content = striptags(comment.content);
  $: deleted = (<any>comment)?.deleted === true;
  // export let voted: 'like' | 'dislike' | undefined;
  // eslint-disable-next-line no-undef
  export let session: App.Session;


  function toImageSource(): IImage {
    const avatar = user?.avatar;
    if (!avatar) {
      return undefined;
    }
    const type = avatar.split('.')[1];
    return {src: avatar, type,};
  }

  interface IImage {
    src: string
    type: string
  }
</script>

{#if deleted}
  <div class="absolute p-2 rounded-md shadow-md min-h-[8rem] w-full">
    <p class="text-center mt-12">이 댓글은 작성자나 관리자에 의해 삭제되었습니다.<span class="text-red-700 dark:text-red-500 cursor-pointer select-none ml-2 hover:underline">신고하기</span></p>
  </div>
{/if}
<div class:ring-2={selected} class:invisible={deleted}
     class="p-2 rounded-md shadow-md min-h-[8rem] divide-y divide-dotted hover:ring-2 ring-offset-2 ring-sky-400 dark:ring-sky-500 dark:ring-offset-gray-600">
  <div class="space-y-4">
    <div class="flex justify-between ml-2" class:mb-3={!showInfo}>
      <div class="flex space-x-2 flex-col md:flex-row lg:flex-row">
        <div on:click={() => {showInfo = !showInfo; selected = !selected}}
             class="flex space-x-2 hover:cursor-pointer group">
          <div class="w-10 min-h-[2.5rem]" on:click={() => console.log(comment)}>
            <CircleAvatar fallback="{toImageSource()}"/>
          </div>
          <span class="mt-2.5 group-hover:text-sky-400">
            {user?.id ?? '[이름을 불러지 못 했습니다]'}
            {#if selected}(이 메시지에 답장 중){/if}
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
  <div class="flex flex-col justify-between p-2 pt-4"
       class:divide-y={!editMode} class:divide-dotted={!editMode}>
    <div class="flex-grow __comment-contents" class:pb-4={!editMode}>
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
        {#each comment.content.split('\n') as line}
          <p class="p-1 __contents-line">{@html line}</p>
        {/each}
      {:else}
        <textarea class="p-1 rounded-md bg-zinc-200 dark:bg-gray-500 w-full focus:outline-none"
                  bind:value={content}></textarea>

      {/if}
    </div>
    {#if session}
      {#if !editMode}
        <div class="pt-2 flex justify-between select-none">
        <span class="space-x-2">
          <span on:click={like} class:cursor-progress={voting}
                class="text-sky-500 {session.uid !== comment.author ? 'hover:text-sky-700' : 'cursor-not-allowed'}  cursor-pointer p-2 sm:p-0">
            {#if liked}
              <Like size="1rem" />
            {:else}
              <LikeEmpty size="1rem" />
            {/if}
            {likeCount}
          </span>
          <span on:click={dislike} class:cursor-progress={voting}
                class="text-red-500 {session.uid !== comment.author ? 'hover:text-red-700' : 'cursor-not-allowed'} cursor-pointer p-2 sm:p-0">
            {#if disliked}
              <Dislike size="1rem" />
            {:else}
              <DislikeEmpty size="1rem" />
            {/if}
            {dislikeCount}
          </span>
        </span>
          <span>
          <span class="cursor-pointer hover:text-sky-400 p-2 sm:p-0"
                on:click={() => onReplyClicked(comment._key)}>
            <Messages size="1rem"/>
          </span>

            {#if session && session.uid !== comment.author}
            <span class="cursor-pointer hover:text-red-600 p-2 sm:p-0"
                  on:click={() => onReportClicked(comment._key)}>
              <Report size="1rem"/>
            </span>
          {/if}
            {#if session?.uid === comment.author}
            <span class="cursor-pointer hover:text-sky-400 p-2 sm:p-0"
                  on:click={() => onEditClicked(comment._key)}>
              <Edit size="1rem"/>
            </span>
          {/if}
            {#if comment.author === session?.uid || session?.rank >= EUserRanks.Manager}
            <span class="cursor-pointer hover:text-red-400 p-2 sm:p-0"
                  on:click={() => onDeleteClicked(comment._key)}>
              <Delete size="1rem"/>
            </span>
          {/if}

            {#if session?.rank >= EUserRanks.Manager}
            <span class="mt-0.5 cursor-pointer hover:text-red-400 p-2 sm:p-0"
                  on:click={() => onLockClicked(comment._key)}>
              <Admin size="1rem"/>
            </span>
          {/if}
        </span>
        </div>
      {:else}
        <div class="flex space-x-2 w-full">
          <button on:click={confirmEdit} class="bg-sky-400 text-white dark:bg-sky-700 rounded-md py-2 w-full shadow-md">
            수정 완료
          </button>
          <button on:click={cancelEdit} class="bg-red-400 text-white dark:bg-red-700 rounded-md py-2 w-full shadow-md">
            취소
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>

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