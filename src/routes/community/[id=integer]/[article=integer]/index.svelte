<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';

  export async function load({params, fetch}: LoadEvent): Promise<LoadOutput> {
    const res = await fetch(`/community/${params.id}/${params.article}/api/read`);
    const data = await res.json();
    return {
      status: 200,
      props: { data },
    }
  }
</script>
<script lang="ts">
  /**
   * 게시글 보기
   */
  export let data;
  console.log(data);
</script>