<script lang="ts">
  import {isEmpty} from 'lodash-es';
  import {createEventDispatcher} from 'svelte';

  const dispatch = createEventDispatcher();

  export let fallback: IImage = {
    src: 'https://s3.ru.hn/IMG_2775.GIF',
    type: 'image/gif',
  };
  export let alt = 'avatar';
  export let images: IImage[] = [];
  export let border = 'md';

  interface IImage {
    src: string
    type: string
  }

  function imageLoaded(event: Event & {path: HTMLElement[]}) {
    dispatch('load', event.path[0]);
  }
</script>
<picture>
  {#each images as image}
    <source srcset={image.src} type={image.type} />
  {/each}
  <img class:border={border === 'sm'} class:border-2={border === 'md'}
       on:load={imageLoaded}
       class="w-full h-full __circle-image object-cover border-white shadow-md"
       src="{fallback?.src}" alt="{isEmpty(images) ? 'fallback-image' : alt}"/>
</picture>

<style>
  .__circle-image {
    border-radius: 50%;
    aspect-ratio: 1/1;
  }
</style>