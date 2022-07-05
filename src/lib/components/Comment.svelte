<script lang="ts">
  import CircleAvatar from '$lib/components/CircleAvatar.svelte';
  import type {IComment} from '$lib/types/comment';
  import type {IUser} from '$lib/types/user';

  import Edit from 'svelte-material-icons/Pencil.svelte';
  import Delete from 'svelte-material-icons/TrashCan.svelte';
  import Report from 'svelte-material-icons/AlertBox.svelte';
  import Lock from 'svelte-material-icons/Lock.svelte';
  import Pub from 'svelte-material-icons/EyeCheck.svelte';
  import Private from 'svelte-material-icons/EyeOff.svelte';
  import Reply from 'svelte-material-icons/Reply.svelte';

  import {EUserRanks} from '$lib/types/user-ranks';
  import TimeAgo from 'javascript-time-ago';
  import {ko} from '$lib/time-ko';
  import {dayjs} from 'dayjs';
  import {createEventDispatcher} from 'svelte';

  const dispatch = createEventDispatcher();

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
    dispatch('edit', {
      id,
    });
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

  function onPubClicked(id: string) {
    dispatch('pub', {
      id,
    });
  }

  function onPrivateClicked(id: string) {
    dispatch('private', {
      id,
    });
  }

  let showInfo = false;
  export let selected = false;
  export let user: IUser;
  export let comment: IComment;
  // eslint-disable-next-line no-undef
  export let session: App.Session;
</script>

<div class="p-2 rounded-md shadow-md min-h-[8rem] divide-y divide-dotted spacey">
  <div class="space-y-4">
    <div class="flex justify-between" class:mb-4={!showInfo}>
      <div class="flex space-x-2 flex-col md:flex-row lg:flex-row">
        <div on:click={() => {showInfo = !showInfo; selected = !selected}} class="flex space-x-2 hover:cursor-pointer group">
          <div class="w-12 min-h-[3rem]">
            <CircleAvatar/>
          </div>
          <span class="mt-2.5 group-hover:text-sky-400">
            {user?.id ?? '[이름을 불러지 못 했습니다]'}
            {#if selected}(이 메시지에 답장 중){/if}
          </span>
        </div>
        <span class="mt-2.5 space-x-1">
          {#if session}
            <span class="cursor-pointer hover:text-sky-400 p-2 sm:p-0"
                  on:click={() => onReplyClicked(comment._key)}>
              <Reply size="1rem"/>
            </span>
          {/if}

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
          {#if comment.author === session?.uid || session?.rank <= EUserRanks.Manager}
            <span class="cursor-pointer hover:text-red-400 p-2 sm:p-0"
                  on:click={() => onDeleteClicked(comment._key)}>
              <Delete size="1rem"/>
            </span>
          {/if}

          {#if session?.rank >= EUserRanks.Manager}
            <span class="mt-0.5 cursor-pointer hover:text-red-400 p-2 sm:p-0"
                  on:click={() => onLockClicked(comment._key)}>
              <Lock size="1rem"/>
            </span>
            <span class="mt-0.5 cursor-pointer hover:text-red-400 p-2 sm:p-0"
                  on:click={() => onPubClicked(comment._key)}>
              <Pub size="1rem"/>
            </span>
            <span class="mt-0.5 cursor-pointer hover:text-red-400 p-2 sm:p-0"
                  on:click={() => onPrivateClicked(comment._key)}>
              <Private size="1rem"/>
            </span>
          {/if}
        </span>
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
  <div class="flex flex-col justify-between p-2 pt-4">
    <div class="grow">

      {#each comment.content.split('\n') as line}
        <p>{line}</p>
      {/each}
    </div>
  </div>
</div>
