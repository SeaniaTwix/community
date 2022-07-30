<script lang="ts">
  import Image from '$lib/components/Image.svelte';
  import {load} from 'cheerio';

  export let contents: string[] = [];

  function hasImages(content: string) {
    const $ = load(content);
    const imgs = $('p > img');
    return imgs.length > 0;
  }

  function getImages(content: string) {
    const $ = load(content);
    const imgs = $('p > img');
    console.log(imgs.length);
    return imgs.toArray();
  }

  export let nsfw = false;

  const youtubeUrlFind =
    /<a href="https:\/\/(?:www\.)?youtu\.?be(?:\.com)?\/(?:watch\?v=)?(.*?)"/;

  function findImages(html: string) {
    const $ = load(html);
    const imgs = $('img');
    console.log(imgs);
    return imgs.toArray().length > 0;
  }

</script>

{#each contents as content}
  {#if youtubeUrlFind.test(content)}
    <iframe width="560" height="315"
            src="https://www.youtube.com/embed/{youtubeUrlFind.exec(content)[1]}"
            title="YouTube video player"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>
  {:else if hasImages(content)}
    {#each getImages(content) as image}
      <Image {nsfw} src="{image.attribs.src}" size="{{x: image.attribs.width, y: image.attribs.height}}" />
    {/each}
  {:else}
    {@html content}
  {/if}
{/each}

<style lang="scss">
  :global {
    article {
      h1 {
        font-size: xx-large;
      }

      h2 {
        font-size: larger;
      }

      h3 {
        font-size: large;
      }

      b, strong {
        font-weight: bold;
      }

      i {
        font-style: italic;
      }

      hr {
        margin-bottom: 1px;
      }

      a[href] {
        color: rgb(56, 189, 248);
        &:hover {

        }
      }

      // maybe youtube only...?
      iframe {
        max-width: 100% !important;
        aspect-ratio: 16/9;
        height: auto !important;
        margin: 1rem 0;
      }
    }
  }
</style>