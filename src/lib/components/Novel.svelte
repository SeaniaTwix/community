<script lang="ts">
  import {striptags} from 'striptags';
  import {isEmpty} from 'lodash-es';

  export let contents: string[] = [];

  let textSize = 1.5;

  function isContentLine(content: string) {
    return !isEmpty(striptags(content).replace(/&nbsp;/, '').trim())
  }

  function replaceEllipsis(content: string) {
    return content.replace(/\.\.\./g, '…');
  }

  function smallerFontSize() {
    textSize = Math.max(1, textSize - 0.25);
  }

  function largerFontSize() {
    textSize = Math.min(4, textSize + 0.25);
  }

</script>

<div>
  <div class="sticky top-0 pt-2">
    <button on:click={smallerFontSize}
            class="shadow-md rounded-md bg-sky-500/50 hover:bg-sky-600/50 px-4 py-2 backdrop-blur-md text-white">
      -
    </button>
    <button on:click={largerFontSize}
            class="shadow-md rounded-md bg-sky-500/50 hover:bg-sky-600/50 px-4 py-2 backdrop-blur-md text-white">
      +
    </button>
  </div>
  <div class="w-11/12 sm:w-2/3 md:1/2 lg:1/3 mx-auto px-2 box-content mb-8 leading-loose" style="font-size: {textSize}rem;">
    {#each contents as content}
      {#if isContentLine(content)}
        <div class="__novel-text indent-3 select-none">
          {@html replaceEllipsis(content)}
        </div>
      {/if}
    {/each}
  </div>
</div>

<style lang="scss">
  :global {
    .__novel-text > p {
      font-family: 'RIDIBatang', sans-serif !important;
    }
  }
</style>