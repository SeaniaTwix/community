<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import HttpStatus from 'http-status-codes';
  import {key} from '$lib/editor-key';
  import type {ITag} from '$lib/types/tag';

  type T = {edit: {title: string, content: string, tag: ITag[]}};

  export async function load({params, url, fetch, session}: LoadEvent): Promise<LoadOutput> {
    const {id, article} = params;
    try {
      const editableRequest = await fetch(`/community/${id}/${article}/api/edit`);
      const {edit} = await editableRequest.json() as T;
      const {title, content, source, tags, tagCounts} = edit;
      const nr = await fetch(`/community/${id}/api/info`);
      const {name} = await nr.json();
      // console.log(edit);
      // noinspection TypeScriptUnresolvedFunction
      return {
        status: HttpStatus.OK,
        props: {
          board: params.id,
          article,
          name,
          title,
          tagCounts,
          source: source ?? '',
          content,
          tags: Object.values(tags).map(v => v.name),
          editorKey: key,
        },
      };
    } catch {
      return {
        status: HttpStatus.NOT_ACCEPTABLE,
      }
    }
  }
</script>
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