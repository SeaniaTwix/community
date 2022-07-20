<script lang="ts">
  import Star from 'svelte-material-icons/Star.svelte';
  import Blind from 'svelte-material-icons/EyeOff.svelte';
  import ky from 'ky-universal';
  import {onMount} from 'svelte';
  import {load} from 'cheerio';
  import {isEmpty, parseInt} from 'lodash-es';

  export let content = '';
  let _ = load(content);
  // noinspection TypeScriptValidateTypes
  const imgObj = _('img')?.[0];
  console.log('img:', imgObj);
  let img: HTMLImageElement;
  export let src: string | undefined;
  export let nsfw = false;
  let loading = true;
  let isFavorite = false;
  let forceShow = false;
  let folded = false;
  let width: number;
  let height: number;
  let isImageSizeDefined = false;

  async function addFavorite() {
    if (loading) {
      return;
    }
    const url = src ?? imgObj?.attribs?.src;
    if (url && url[1].startsWith('http')) {
      const u = url[1];
      await ky.put('/user/favorite/image', {
        json: {
          url: u,
        },
      });
    }
  }

  onMount(() => {
    addImageSize(img);
  });

  function onlyNumber(text: string): number | undefined {
    try {
      return parseInt(/\d+/.exec(text)[0]);
    } catch {
      return undefined;
    }
  }

  function addImageSize(element: HTMLImageElement) {
    console.log('addImageSize');
    isImageSizeDefined = true;
    // check preloaded
    if (!imgObj) {
      element.style.width = `${element.naturalWidth}px`;
    } else {
      let w = element.getAttribute('width');
      if (!w) {
        w = element.style.width;
        if (isEmpty(w)) {
          w = element.naturalWidth.toString();
        }
      }

      width = onlyNumber(w) ?? 0;
      element.width = width;

      let h = element.getAttribute('height');
      if (!h) {
        h = element.style.height;
        if (isEmpty(h)) {
          h = element.naturalHeight.toString();
        }
      }

      height = onlyNumber(h) ?? 0;
      element.height = height;
    }

    console.log(width, height);

    folded = element.height > 968; //968;
  }

  function autoNaturalSize(element: HTMLImageElement) {
    element.addEventListener('load', () => addImageSize(img));
  }

  function show() {
    if (!forceShow) {
      forceShow = true;
    }
  }

  function hide() {
    console.log('hide');
    forceShow = false;
  }

</script>
<div class="relative group inline-block" class:cursor-pointer={nsfw && !forceShow}>
  <div class="absolute w-full">
    {#if !nsfw || forceShow}
      <span class="absolute z-[1] mt-2 ml-2 invisible group-hover:visible text-zinc-200 select-none">
        <span on:click={addFavorite}
              class="hover:text-yellow-400 cursor-pointer drop-shadow transition-all">
          <Star size="2rem"/>
        </span>
        {#if nsfw}
          <span on:click={hide} class="hover:text-red-500 cursor-pointer drop-shadow transition-all">
            <Blind size="2rem"/>
          </span>
        {/if}
      </span>
    {/if}
  </div>
  <div on:click={show} class="__article-image overflow-hidden rounded-md shadow-md">
    {#if nsfw && !forceShow}
      <p
        class="__center-text px-3 py-1 bg-gray-900/40 text-sm z-[1] rounded-md text-zinc-100 mx-auto w-max select-none">
        클릭하면 원본 이미지를 볼 수 있습니다.
      </p>
    {/if}
    <span class="relative transition-all __target {folded ? '__folded-image' : '__unfolded-image'}"
          class:select-none={nsfw && !forceShow}
          class:pointer-events-none={nsfw && !forceShow}>
      <img src="{src ?? imgObj.attribs?.src}" alt="유즈는 귀엽다"
           use:autoNaturalSize class:blur-2xl={nsfw && !forceShow} bind:this={img}
           width="{imgObj?.attribs?.width ?? width}" height="{imgObj?.attribs?.height ?? height}" />
    </span>
    {#if folded}
      <div on:click={() => (folded = false)}
           class="cursor-pointer select-none text-center p-1 transition-colors hover:bg-zinc-200 dark:bg-gray-700 dark:hover:bg-gray-800">
        펼치기
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  :global {
    .__article-image {
      display: inline-block;

      p {
        display: inline-block;

        img {
          display: inline-block;
          max-width: 100% !important;
        }
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

  :global {
    .__folded-image > img {
      max-height: 1000px;
      object-fit: cover;
      object-position: top;
    }
  }
</style>