<script lang="ts">
  import FullEditor from '$lib/components/FullEditor.svelte';
  import type {PageData} from './$types';

  export let data: PageData;

  console.log(data);

  let editorKey: string = data.editorKey;
  let name: string = data.boardName;
  let usedTags: string[] = data.usedTags;

</script>

<svelte:head>
  <title>게시판 - {name} - 새 글 쓰기</title>
</svelte:head>

<div class="mt-10 w-10/12 md:w-4/6 lg:w-3/5 mx-auto">
  <FullEditor {editorKey} {usedTags} />
</div>
