<script>
  import Star from 'svelte-material-icons/Star.svelte';
  import {load} from 'cheerio';

  export let content = '';

  const srcLexer = /<img\s[^>]*?src\s*=\s*['"]([^'"]*?)['"][^>]*?>/gm;
  const altLexer = /<img\s[^>]*?alt\s*=\s*['"]([^'"]*?)['"][^>]*?>/gm;
  const widthLexer = /<img\s[^>]*?width\s*=\s*['"]([^'"]*?)['"][^>]*?>/gm;
  const heightLexer = /<img\s[^>]*?height\s*=\s*['"]([^'"]*?)['"][^>]*?>/gm;



</script>
<div class="relative group __article-image">
  <span class="absolute hidden group-hover:inline text-zinc-200 hover:text-yellow-400 mt-2 ml-2 cursor-pointer">
    <Star size="2rem" />
  </span>
  <slot />
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
</style>