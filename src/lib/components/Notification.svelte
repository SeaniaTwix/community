<script lang="ts">
  import Close from 'svelte-material-icons/WindowMinimize.svelte';
  import CloseAll from 'svelte-material-icons/NotificationClearAll.svelte';
  import Goto from 'svelte-material-icons/ArrowRight.svelte';
  import {createEventDispatcher} from 'svelte';
  import {theme} from '$lib/stores/shared/theme';
  import type {IPublicNotify} from '$lib/types/notify';
  import {goto} from '$app/navigation';

  const dispath = createEventDispatcher();

  export let notification: IPublicNotify;
  export let isDummy = false;

  function closeClicked() {
    dispath('close');
  }

  function closeAllClicked() {
    dispath('closeall');
  }

  function titleClicked() {
    dispath('clicktitle', notification);
  }

  function bodyClicked() {
    dispath('clickbody', notification);
  }

  function gotoNotifications() {
    goto('/notifications');
    dispath('closeall');
  }

  function title() {
    if (!notification) {
      return '';
    }
    return {
      'comment': '내 게시글에 댓글이 달렸습니다.',
      'reply': '내 댓글에 댓글이 달렸습니다.',
      'vote': '추천을 받았습니다.',
    }[notification.type];
  }

  function content() {
    if (!notification) {
      return '';
    }
    return notification.content;
  }

  $: color = $theme?.mode === 'light' ? '__fix-safari-rounded-outline' : 'dark:__fix-safari-rounded-outline';

</script>
<div class="shadow-md rounded-md">
  <div id="notify-{notification?._key}"
       class="{color} text-sm rounded-md bg-zinc-100/50 dark:bg-gray-500/50 outline outline-zinc-200/50
            dark:outline-white/25 overflow-hidden w-full min-w-[15rem] backdrop-blur-md transition-colors
            select-none text-zinc-700 dark:text-zinc-300">
    {#if isDummy}
      <div class="w-full h-4"></div>
    {:else}
      <div class="px-2 py-1 flex flex-row justify-between items-center ">
        <span class="hover:underline cursor-pointer" on:click={titleClicked}>{title()}</span>
        <span class="__hide-in-touch-devices flex flex-row space-x-1 pl-2">
          <button on:click={gotoNotifications} class="__circle group inline-block shadow-md bg-sky-400 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-zinc-100 w-3.5 h-3.5 items-center leading-zero text-xs text-center flex flex-col justify-center transition-colors cursor-default">
            <span class="invisible group-hover:visible">
              <Goto />
            </span>
          </button>
          <button on:click={closeClicked} class="__circle group inline-block shadow-md bg-amber-400 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 text-zinc-100 w-3.5 h-3.5 items-center leading-zero text-xs text-center flex flex-col justify-center transition-colors cursor-default">
            <span class="invisible group-hover:visible">
              <Close />
            </span>
          </button>
          <button on:click={closeAllClicked} class="__circle group inline-block shadow-md bg-red-400 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 text-zinc-100 w-3.5 h-3.5 items-center leading-zero text-xs text-center flex flex-col justify-center transition-colors cursor-default">
            <span class="invisible group-hover:visible">
              <CloseAll />
            </span>
          </button>
        </span>
      </div>
      <div class="group px-4 py-2 relative min-h-[4rem] cursor-pointer" on:click={bodyClicked}>
        <div class="group-hover:underline">
          {content()}
        </div>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  $light: rgb(228 228 231 / 0.5);
  $dark: rgb(255 255 255 / 0.25);

  .__hide-in-touch-devices {
    @media (hover: none) {
      display: none;
    }
  }

  :global {
    .__fix-safari-rounded-outline {
      @supports (-webkit-hyphens:none) or (-webkit-touch-callout: none) {
        outline: 0;
        box-shadow: 0 0 0 2px $light;
      }
    }

    .dark .dark\:__fix-safari-rounded-outline {
      @supports (-webkit-hyphens:none) or (-webkit-touch-callout: none) {
        outline: 0;
        box-shadow: 0 0 0 2px $dark;
      }
    }
  }

   .__circle {
     border-radius: 50%;
     aspect-ratio: 1/1;
   }

</style>