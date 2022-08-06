<script lang="ts">
  export let videos: IVideo[] = [];
  export let width: string | undefined;
  export let height: string | undefined;
  export let controls: 'true' | undefined;
  interface IVideo {
    src: string;
    type: string;
  }
</script>
<video preload="metadata" {controls} {width} {height} >
  {#each videos as video}
    <source src="{video.src}" type="{video.type}">
  {/each}
  <slot />
  <track kind="captions" src="">
</video>