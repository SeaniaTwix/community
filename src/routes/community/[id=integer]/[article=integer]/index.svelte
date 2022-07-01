<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';

  export async function load({params, fetch}: LoadEvent): Promise<LoadOutput> {
    const res = await fetch(`/community/${params.id}/${params.article}/api/read`);
    const {article} = await res.json();
    return {
      status: 200,
      props: { article },
    }
  }
</script>
<script lang="ts">
  /**
   * 게시글 보기
   */
  export let article;
  console.log(article);
</script>

<div class="p-4 w-10/12 md:w-3/5 lg:w-1/3 mx-auto rounded-md shadow-md transition-transform">
  <h2 class="text-2xl">{article.title}</h2>
  <div>
    {@html article.content}
  </div>
</div>