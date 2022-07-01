<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';

  export async function load({params, url, fetch}: LoadEvent): Promise<LoadOutput> {
    const res = await fetch(`${url.pathname}/api/list`);
    const {list} = await res.json();
    const id = params.id;
    console.log('board:', id);
    return {
      status: 200,
      props: {list, id, params},
    }
  }
</script>
<script lang="ts">
  import type {ArticleDto} from '$lib/types/dto/article.dto';
  import ArticleList from '$lib/components/ArticleList.svelte';
  import {onMount} from 'svelte';

  export let list: ArticleDto[];
  export let id: string;
  export let params;

  onMount(() => {
    id = params.id;
  })

  console.log(id, params);
</script>

<div class="w-10/12 md:w-2/3 lg:w-3/5 mx-auto space-y-4 transition-transform">
  <h2 class="text-2xl">
    게시판
  </h2>
  <a href="/community/{params.id}/write"
     class="px-4 py-2 inline-block ring-1 ring-sky-400 rounded-md shadow-md">
    새 글 쓰기
  </a>
  <ArticleList board={id} {list} />
</div>
