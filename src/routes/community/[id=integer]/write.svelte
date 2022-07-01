<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import HttpStatus from 'http-status-codes';

  export async function load({params}: LoadEvent): Promise<LoadOutput> {
    if (!params?.id) {
      return {
        status: HttpStatus.FORBIDDEN,
      };
    }
    return {
      status: 200,
      props: {
        board: params.id,
      },
    };
  }
</script>
<script lang="ts">
  import Plus from 'svelte-material-icons/Plus.svelte';
  import Delete from 'svelte-material-icons/Delete.svelte';
  // import 'froala-editor/css/froala_editor.min.css';
  import _ from 'lodash-es';
  import type {ArticleDto} from '$lib/types/dto/article.dto';
  import ky from 'ky-universal';
  import {goto} from '$app/navigation';
  import Tiptap from '$lib/components/Tiptap.svelte';

  import type {Editor} from '@tiptap/core';

  export let board: string;

  let editorObject: Editor;

  let tagInput: HTMLInputElement;
  let editor;
  let title = '';
  let tag = '';
  let tags = [];

  let addMode = false;

  async function loadEditor(element: HTMLDivElement) {
    // noinspection TypeScriptCheckImport
    const Editor = (await import('froala-editor')).default;
    // noinspection TypeScriptCheckImport
    const ko = (await import('froala-editor/js/languages/ko')).default;
    editor = new Editor(element, {
      language: 'ko',
    });
  }

  async function upload() {
    console.log(tags);

    const data: ArticleDto = {
      board,
      title,
      content: editorObject.getHTML(),
      tags,
    };

    const response = await ky.post(`/community/${board}/api/write`, {
      json: data,
    });

    const {id} = await response.json<{ id: string }>();

    goto(`/community/${board}/${id}`).then();
  }

  function addTagClicked() {
    if (!addMode) {
      addMode = true;
      setTimeout(() => tagInput.focus(), 10);
    }
  }

  function isNotEmpty(o) {
    return !_.isEmpty(o);
  }

  function detectEnter(event: KeyboardEvent) {

    if (event.isComposing || event.keyCode === 229) {
      return;
    }
    if (event.key === 'Enter') {
      tags = _.uniq([...tags, ...tag.trim().split(' ').filter(isNotEmpty)]);
      tag = '';
    }
  }

  function deleteTag(target: string) {
    tags = tags.filter(v => v !== target);
  }

</script>

<div class="mt-10 w-10/12 md:w-3/5 lg:w-2/5 mx-auto space-y-4">
  <input class="px-4 py-2 w-full outline outline-sky-400 dark:outline-sky-800 rounded-md dark:bg-gray-200 dark:text-gray-800"
         type="text" placeholder="제목" bind:value={title}/>
  <Tiptap bind:editor={editorObject}/>
  <div class="text-sm">
    <div id="__tags" class="space-x-2 inline-block">
      {#each tags as tag}
        <span class="rounded-md bg-zinc-100 dark:bg-gray-700 px-2 py-1">{tag}<span class="cursor-pointer"
                                                                  on:click={() => deleteTag(tag)}><Delete size="1rem"
                                                                                                          color="rgb(248, 113, 113)"/></span></span>
      {/each}
    </div>
    <span class="rounded-md bg-zinc-100 dark:bg-gray-700 px-2 py-1 transition transition-transform cursor-pointer" on:click={addTagClicked}>
      {#if addMode}
        <input bind:this={tagInput} bind:value={tag} type="text" placeholder="태그를 입력하세요... (띄어쓰기로 구분)"
               on:keydown={detectEnter} class="bg-transparent w-fit min-w-[14rem] focus:outline-none"/>
      {:else}
        <Plus size="1rem"/>새 태그 추가
      {/if}
    </span>
  </div>
  <div class="flex space-x-2">
    <button on:click={upload}
            class="items-center flex-grow bg-sky-400 dark:bg-sky-800 rounded-md text-white py-2">
      업로드
    </button>
    <button class="items-center bg-red-400 dark:bg-red-800 px-4 py-2 text-white rounded-md">
      취소
    </button>
  </div>
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
  }
</style>