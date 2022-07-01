<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';

  export async function load({params, url, fetch}: LoadEvent): Promise<LoadOutput> {
    const res = await fetch(`${url.pathname}/api/list`);
    const {list} = await res.json();
    console.log(params);
    return {
      status: 200,
      props: {list, id: params.id},
    }
  }
</script>
<script lang="ts">
  import type {ArticleDto} from '$lib/types/dto/article.dto';
  import ArticleList from '$lib/components/ArticleList.svelte';

  export let list: ArticleDto[];
  export let id: string;
</script>

<h2>
  게시판
</h2>

<a href="/community/{id}/write"
   class="px-4 py-2 inline-block ring-1 ring-sky-400 rounded-md shadow-md">
  새 글 쓰기
</a>

<ArticleList {list} />