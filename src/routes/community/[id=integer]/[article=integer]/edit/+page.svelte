<script lang="ts">
  import FullEditor from '$lib/components/FullEditor.svelte';
  import type {PageData} from './$types';
  import {page} from '$app/stores';

  export let data: PageData;

  let title = data.title;
  let source = data.source;
  let content = data.content;
  let tags: string[] = data.tags;
  // eslint-disable-next-line no-redeclare
  declare var tagCounts: number;
  $: tagCounts = tags.length;

  let article = $page.params.article;
  let board = $page.params.id;
  let name = data.boardName;
  let usedTags: string[] = [];

</script>

<svelte:head>
  <title>{name} - {title} 수정 중</title>
</svelte:head>

<div class="__mobile-bottom-fix mt-10 w-10/12 md:w-4/6 lg:w-3/5 mx-auto space-y-4">
  {#await fetch('/community/api/editor', {method: 'GET'})}
    <p>Loading editor...</p>
  {:then editor}
    <FullEditor editorKey={editor.key} {board} {usedTags} {title} {source} {content} {tags} {article} {tagCounts} isEditMode="{true}" />
  {/await}
</div>

<style lang="scss">
  :global {
    svg {
      display: inline-block;
      vertical-align: sub;
    }

    #__tags {
      span {
        svg {
          display: inline-block;
          vertical-align: middle;
        }
      }
    }

    .fr-wrapper {
      min-height: 10rem;
    }

    /*
    .tox-tinymce {
      border: 1.5px solid rgb(56, 189, 248) !important;
    } // */
  }

  // ios bottom gap
  // noinspection CssOverwrittenProperties
  .__mobile-bottom-fix {
    margin-bottom: 1rem;
    // noinspection CssInvalidFunction
    margin-bottom: constant(safe-area-inset-bottom);
    margin-bottom: env(safe-area-inset-bottom);
  }
</style>