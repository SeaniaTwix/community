<script lang="ts">
  import Star from 'svelte-material-icons/Star.svelte';
  import Recycling from 'svelte-material-icons/Attachment.svelte';
  import Blind from 'svelte-material-icons/EyeOff.svelte';
  import ky from 'ky-universal';
  import {onMount} from 'svelte';
  import {session} from '$app/stores';
  import {isEmpty, parseInt} from 'lodash-es';
  import HttpStatus from 'http-status-codes';
  import {imageSrc} from '../community/comment/client';
  import type {FavoriteImage} from '$lib/community/comment/client';

  let img: HTMLImageElement;
  let wrapper: HTMLDivElement;
  export let src: string | undefined;
  export let nsfw = false;
  export let size: { x: number, y: number } | undefined;
  let loading = true;
  let isFavorite = false;
  let forceShow = false;
  let folded = false;
  let width = size?.x;
  let height = size?.y;
  let isImageSizeDefined = false;

  async function deleteFavorite() {
    // todo
  }

  async function addFavorite() {
    // console.log('addFavorite:', loading)
    if (isFavorite) {
      return deleteFavorite();
    }
    if (loading) {
      return;
    }
    const url = src;
    if (url) {
      const res = await ky.post('/user/favorite/image', {
        json: {
          url: url.trim(),
          name: '',
          size: {x: parseInt(width), y: parseInt(height)},
        },
      });

      isFavorite = res.status === HttpStatus.ACCEPTED;
    }
  }

  async function recycleImage() {
    if (loading) {
      return;
    }
    const url = src;
    if (typeof url === 'string') {
      const data: FavoriteImage = {
        size: size ?? {x: parseInt(width), y: parseInt(height)},
        src: url
      };
      imageSrc.set(data);
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
    isImageSizeDefined = true;

    if (!width) {
      let x = element.getAttribute('width');
      if (size?.x) {
        x = size.x.toString();
      } else if (!x) {
        x = element.style.width;
        if (isEmpty(x)) {
          x = element.naturalWidth.toString();
        }
      }

      if (parseInt(onlyNumber(x)) > 0) {
        width = onlyNumber(x);
      }
    }

    if (!height) {
      let y = element.getAttribute('height');

      if (size?.y) {
        y = size.y.toString();
      } else if (!y) {
        y = element.style.height;
        if (isEmpty(y)) {
          y = element.naturalHeight.toString();
        }
      }

      if (parseInt(onlyNumber(y)) > 0) {
        height = onlyNumber(y);
      }
    }


    folded = element.height > 968; //968;
  }

  async function onImageLoaded(element: HTMLImageElement) {
    autoNaturalSize(element);
    try {
      if ($session.user) {
        const {name} = await ky
          .get(`/user/favorite/image?url=${encodeURIComponent(element.src)}`)
          .json<{ name: string | null }>();
        isFavorite = !!name;
      }
    } finally {
      loading = false;
    }
  }

  function autoNaturalSize(element: HTMLImageElement) {
    addImageSize(element);
  }

  function show() {
    if (!forceShow) {
      forceShow = true;
    }
  }

  function hide() {
    // console.log('hide');
    forceShow = false;
  }

</script>
<div class="relative group inline-block max-w-full" class:cursor-pointer={nsfw && !forceShow}>
  <div class="absolute w-full">
    {#if !nsfw || forceShow}
      <span class="absolute z-[1] mt-2 ml-2 invisible group-hover:visible text-zinc-200 select-none">
        {#if $session.user}
          <span on:click={addFavorite} prevent-reply
                class:text-yellow-400={isFavorite}
                class="{isFavorite ? 'hover:text-red-400' : 'hover:text-yellow-400'} cursor-pointer drop-shadow transition-all">
            <Star size="2rem"/>
          </span>
          <span on:click={recycleImage} prevent-reply
                class="hover:text-lime-500 cursor-pointer drop-shadow transition-all">
            <Recycling size="2rem"/>
          </span>
        {/if}
        {#if nsfw}
          <span on:click={hide} prevent-reply
                class="hover:text-red-500 cursor-pointer drop-shadow transition-all">
            <Blind size="2rem"/>
          </span>
        {/if}
      </span>
    {/if}
  </div>
  <div bind:this={wrapper} on:click={show}
       style="{size?.x ? `width: ${size.x}px;` : ''} {size?.y ? `max-height: ${size.y}px;` : ''}"
       class="__article-image overflow-hidden rounded-md shadow-md object-cover max-w-full">
    {#if nsfw && !forceShow}
      <p
        class="__center-text px-3 py-1 bg-gray-900/40 text-sm z-[1] rounded-md text-zinc-100 mx-auto w-max select-none">
        클릭하면 원본 이미지를 볼 수 있습니다.
      </p>
    {/if}
    <span class="relative transition-all __target {folded ? '__folded-image' : '__unfolded-image'}"
          class:select-none={nsfw && !forceShow}
          class:pointer-events-none={nsfw && !forceShow}>
      <img {src} alt="유즈는 귀엽다" loading="lazy" crossorigin="anonymous"
           class="min-w-full"
           bind:this={img}
           on:load={() => onImageLoaded(img)}
           class:blur-2xl={nsfw && !forceShow}
           width="{size ? undefined : width}"
           height="{size ? undefined : height}"/>
    </span>
    {#if folded}
      <div on:click={() => (folded = false)} prevent-reply
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