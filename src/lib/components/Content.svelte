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
    <p>
      {#each getImages(content) as image}
        <Image {nsfw} src="{image.attribs.src}" size="{{x: image.attribs.width, y: image.attribs.height}}" sources="{image.sources}" />
      {/each}
    </p>
  {:else}
    {@html content}
  {/if}
{/each}

<style lang="scss">
  :global {
    article {
      h1 {
        font-size: 2rem;
        margin-block-start: 0.67em;
        margin-block-end: 0.67em;
      }

      h2 {
        font-size: 1.5rem;
        font-weight: bold;
        margin-block-start: 0.83em;
        margin-block-end: 0.83em;
      }

      h3 {
        font-size: 1.17em;
        margin-block-start: 1em;
        margin-block-end: 1em;
      }

      h4 {
        margin-block-start: 1.33em;
        margin-block-end: 1.33em;
      }

      h5 {
        font-size: 0.83em;
        margin-block-start: 1.67em;
        margin-block-end: 1.67em;
      }

      h6 {
        font-size: 0.67em;
        margin-block-start: 2.33em;
        margin-block-end: 2.33em;
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

      ol {
        list-style-type: decimal;
        padding-inline-start: 40px;
      }

      ul {
        list-style-type: disc;
        padding-inline-start: 40px;
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