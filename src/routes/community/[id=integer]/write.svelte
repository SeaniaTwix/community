<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import HttpStatus from 'http-status-codes';
  import {key} from '$lib/editor-key';

  export async function load({params, session, fetch}: LoadEvent): Promise<LoadOutput> {
    if (!params?.id) {
      return {
        status: HttpStatus.FORBIDDEN,
      };
    }

    if (!session) {
      try {
        localStorage.setItem('ru.hn:back', `/community/${params.id}/write`);
      } catch {}

      return {
        status: HttpStatus.MOVED_TEMPORARILY,
        redirect: '/login',
      }
    }

    const nr = await fetch(`/community/${params.id}/api/info`);
    const {name} = await nr.json();

    return {
      status: 200,
      props: {
        board: params.id,
        editorKey: key,
        name,
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
  //import Tiptap from '$lib/components/Tiptap.svelte';
  // import type {Editor} from '@tiptap/core';
  import Editor from '@tinymce/tinymce-svelte';
  import {onMount} from 'svelte';
  import {CookieParser} from '$lib/cookie-parser';
  import {theme} from '$lib/stores/shared/theme';

  export let editorKey: string;
  export let board: string;
  export let name: string;

  $: dark = $theme.mode === 'dark';

  const defaultEditorSettings = {
    language: 'ko_KR',
    plugins: 'image imagetools media searchreplace code autolink',
    toolbar: 'undo redo | blocks | bold italic | alignleft aligncentre alignright alignjustify | indent outdent | bullist numlist | searchreplace code removeformat',
    // menubar: 'code',
    resize: true,
    min_height: 160,
    // skin: dark ? 'oxide-dark' : 'silver',
    // content_css: dark ? 'dark' : 'default',
  }

  const darkEditorSettings = {
    ...defaultEditorSettings,
    skin: 'oxide-dark',
    content_css: 'dark',
  }

  // let editorObject: Editor;

  let titleInput: HTMLInputElement;
  let tagInput: HTMLInputElement;
  let editor;
  let title = '';
  let content = '';
  let tag = '';
  let tags = [];
  let editorLoaded = false;

  let addMode = false;

  let uplading = false;

  async function upload() {
    if (uplading) {
      return;
    }

    uplading = true;

    try {
      const data: ArticleDto = {
        views: 0,
        board,
        title,
        content, //editorObject.getHTML(),
        tags
      };

      const response = await ky.post(`/community/${board}/api/write`, {
        json: data,
      });

      const {id} = await response.json<{ id: string }>();

      goto(`/community/${board}/${id}`).then();
    } finally {
      uplading = false;
    }
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

  function defaultEditorResized(event: CustomEvent) {

  }

  function detectPaste(event: KeyboardEvent, type: 'down' | 'up') {
    console.log(type, event);
  }

  onMount(() => {
    titleInput.focus();
  })

</script>

<svelte:head>
  <title>게시판 - {name} - 새 글 쓰기</title>
</svelte:head>

<div class="mt-10 w-10/12 md:w-4/6 lg:w-3/5 mx-auto space-y-4">
  <input bind:this={titleInput}
    class="px-4 py-2 w-full outline outline-sky-400 dark:outline-sky-800 rounded-md dark:bg-gray-200 dark:text-gray-800"
    type="text" placeholder="제목" bind:value={title}/>
  <div class="min-h-[25rem]">
    {#if !editorLoaded}
      에디터 초기화 중...
    {/if}
    <div class:hidden={!editorLoaded}>
      {#if dark}
        <Editor on:init={() => (editorLoaded = true)}
                apiKey="{editorKey}"
                conf="{darkEditorSettings}"
                bind:value={content}
                on:resizeeditor={console.log}
                on:keydown={(e) => detectPaste(e, 'down')}
                on:keyup={(e) => detectPaste(e, 'up')}/>
      {:else}
        <Editor on:init={() => (editorLoaded = true)}
                apiKey="{editorKey}"
                conf="{defaultEditorSettings}"
                bind:value={content} />
      {/if}
    </div>
  </div>
  <div class="text-sm">
    <div id="__tags" class="space-x-2 inline-block">
      {#each tags as tag}
        <span class="rounded-md bg-zinc-100 dark:bg-gray-700 px-2 py-1"
        >{tag}<span class="cursor-pointer"
                    on:click={() => deleteTag(tag)}><Delete size="1rem"
                                                            color="rgb(248, 113, 113)"/></span></span>
      {/each}
    </div>
    <span class="rounded-md bg-zinc-100 dark:bg-gray-700 px-2 py-1 transition transition-transform cursor-pointer"
          on:click={addTagClicked}>
      {#if addMode}
        <input bind:this={tagInput} bind:value={tag} type="text" placeholder="태그를 입력하세요... (띄어쓰기로 구분)"
               on:keydown={detectEnter} class="bg-transparent w-fit min-w-[14rem] focus:outline-none"/>
      {:else}
        <Plus size="1rem"/>새 태그 추가
      {/if}
    </span>
  </div>
  <div class="flex space-x-2">
    <button on:click={upload} on:cursor-not-allowed={uplading}
            class="items-center flex-grow bg-sky-400 dark:bg-sky-800 rounded-md text-white py-2">
      {#if uplading}
        전송 중...
      {:else}
        작성 완료
      {/if}
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

    /*
    .tox-tinymce {
      border: 1.5px solid rgb(56, 189, 248) !important;
    } // */
  }
</style>