<script>
  import Close from 'svelte-material-icons/WindowMinimize.svelte';
  import CloseAll from 'svelte-material-icons/Close.svelte';
  import {createEventDispatcher} from 'svelte';
  import {theme} from '$lib/stores/shared/theme';

  const dispath = createEventDispatcher();

  export let title = '';
  export let content = '';
  export let key = '';
  export let isDummy = false;

  function closeClicked() {
    dispath('close', key);
  }

  $: color = $theme?.mode === 'light' ? '__fix-safari-rounded-outline' : 'dark:__fix-safari-rounded-outline';

</script>
<div class="hidden shadow-md rounded-md">
  <div id="notify-{key}"
       class="{color} text-sm rounded-md bg-zinc-100/50 dark:bg-gray-500/50 outline outline-zinc-200/50
            dark:outline-white/25 overflow-hidden w-full min-w-[15rem] backdrop-blur-md transition-colors
            select-none text-zinc-700 dark:text-zinc-300">
    {#if isDummy}
      <div class="w-full h-4"></div>
    {:else}
      <div class="px-2 py-1 flex flex-row justify-between items-center ">
        <span class="hover:underline">{title}</span>
        <span class="__hide-in-touch-devices flex flex-row space-x-1">
          <button class="__circle group inline-block shadow-md bg-amber-400 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 text-zinc-100 w-3.5 h-3.5 items-center leading-zero text-xs text-center flex flex-col justify-center transition-colors cursor-default">
            <span on:click={closeClicked} class="invisible group-hover:visible">
              <Close />
            </span>
          </button>
          <button class="__circle group inline-block shadow-md bg-red-400 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 text-zinc-100 w-3.5 h-3.5 items-center leading-zero text-xs text-center flex flex-col justify-center transition-colors cursor-default">
            <span on:click={closeClicked} class="invisible group-hover:visible">
              <CloseAll />
            </span>
          </button>
        </span>
      </div>
      <div class="group px-4 py-2 relative min-h-[4rem] cursor-pointer">
        <div class="group-hover:underline">
          {content}
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