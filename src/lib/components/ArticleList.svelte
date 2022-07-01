<script lang="ts">
  import type {ArticleItemDto} from '$lib/types/dto/article-item.dto';

  export let list: ArticleItemDto[] = [];
</script>

<div>
  <ul>
    {#each list as article}
      <li>
        {article.title}
      </li>
    {/each}
  </ul>
</div>