<script lang="ts">
  import FullEditor from '$lib/components/FullEditor.svelte';

  export let title = '';
  export let source = '';
  export let content = '';
  export let tags: string[] = [];
  export let tagCounts = tags.length;

  export let editorKey: string;
  export let article: string;
  export let board: string;
  export let name: string;
  export let usedTags: string[] = [];

</script>

<svelte:head>
  <title>{name} - {title} 수정 중</title>
</svelte:head>

<div class="__mobile-bottom-fix mt-10 w-10/12 md:w-4/6 lg:w-3/5 mx-auto space-y-4">
  <FullEditor {editorKey} {board} {usedTags} {title} {source} {content} {tags} {article} {tagCounts} isEditMode="{true}" />
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