<script lang="ts">
  import Image from '$lib/components/Image.svelte';
  import {load} from 'cheerio';

  export let contents: string[] = [];

  function hasImages(content: string) {
    const $ = load(content);
    const imgs = $('p > img');
    if (imgs.length <= 0) {
      const picutres = $('p > picture');
      return picutres.length > 0;
    }
    return true;
  }

  function getImages(content: string) {
    const $ = load(content);
    const allImages = $('p > img,picture');
    return allImages.toArray().map((element) => {
      if (element.name === 'picture') {
        const original = $(element).children('img').first();
        return {
          attribs: {
            src: original.attr('src'),
            width: original.attr('width'),
            height: original.attr('height'),
          },
          sources: $(element).children('source').toArray().map(elem => elem.attribs),
        }
      }
      return element;
    });
  }

  export let nsfw = false;

  const youtubeUrlFind =
    /<a href="https:\/\/(?:www\.)?youtu\.?be(?:\.com)?\/(?:watch\?v=)?(.*?)"/;

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
      <Image {nsfw} src="{image.attribs.src}" size="{{x: image.attribs.width, y: image.attribs.height}}" sources="{image.sources}" />
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