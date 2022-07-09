<script lang="ts">
  import {isEmpty} from 'lodash-es';

  export let fallback: IImage = {
    src: 'https://s3.ap-northeast-2.wasabisys.com/s3.ru.hn/IMG_2775.GIF',
    type: 'image/gif',
  };
  export let alt = 'avatar';
  export let images: IImage[] = [];
  export let border = 'md';

  interface IImage {
    src: string
    type: string
  }
</script>
<picture>
  {#each images as image}
    <source srcset={image.src} type={image.type} />
  {/each}
  <img class:border={border === 'sm'} class:border-2={border === 'md'}
       class="w-full h-full __circle-image object-cover border-white shadow-md"
       src="{fallback.src}" alt="{isEmpty(images) ? 'fallback-image' : alt}"/>
</picture>

<style>
  .__circle-image {
    border-radius: 50%;
    aspect-ratio: 1/1;
  }
</style>