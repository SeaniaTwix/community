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
      const {title, content, tags} = edit;
      const nr = await fetch(`/community/${id}/api/info`);
      const {name} = await nr.json();
      console.log(edit);
      // noinspection TypeScriptUnresolvedFunction
      return {
        status: HttpStatus.OK,
        props: {
          board: params.id,
          article,
          name,
          title,
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
  import Plus from 'svelte-material-icons/Plus.svelte';
  import Delete from 'svelte-material-icons/Delete.svelte';
  import {writable} from 'svelte/store';
  import {theme} from '$lib/stores/shared/theme';
  import ky from 'ky-universal';
  import {onDestroy, onMount, tick} from 'svelte';
  import type {Editor as TinyMCE, Events} from 'tinymce';
  import Editor from '@tinymce/tinymce-svelte';
  import _ from 'lodash-es';
  import {assets} from '$app/paths';
  import {goto} from '$app/navigation';

  console.log('assets:', assets);

  export let title = '';
  export let source = '';
  export let content = '';
  export let tags: string[] = [];

  let tagInput: HTMLInputElement;
  let titleInput: HTMLInputElement;
  let fileUploader: HTMLInputElement;
  let editorLoaded = false;
  const f = writable<File>(null);
  let tag = '';
  let addMode = false;
  let editor: TinyMCE;
  let updating = false;

  export let editorKey: string;
  export let article: string;
  export let board: string;
  export let name: string;

  $: dark = $theme.mode === 'dark';

  function imageUpload(file: File) {
    return new Promise<string>(async (resolve, reject) => {
      try {
        // const file = blobInfo.blob();
        const request = await ky.post(`/file/request?type=${file.type}`)
          .json<{ uploadUrl: string, key: string }>();
        await ky.put(request.uploadUrl, {
          body: file,
          onDownloadProgress: console.log,
        });
        // console.log(blobInfo.blob());
        resolve(`https://s3.ru.hn/${request.key}`);
      } catch (e) {
        reject(e);
      }
    });
  }

  function fileSelected() {
    f.set(fileUploader.files[0]);
  }

  function insertImage(imageUrl: string) {
    editor.insertContent(`<img src="${imageUrl}" alt="uploaded-at-${new Date}" />`);
  }

  function detectPaste(event: KeyboardEvent, type: 'down' | 'up') {
    console.log(type, event);
  }

  function isNotEmpty(o) {
    return !_.isEmpty(o);
  }

  function addTagClicked() {
    if (!addMode) {
      addMode = true;
      setTimeout(() => tagInput.focus(), 10);
    }
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

  const defaultEditorSettings = {
    language: 'ko_KR',
    plugins: 'image media searchreplace code autolink autosave',
    toolbar: 'uploadImageRu image | undo redo | blocks | bold italic | alignleft aligncentre alignright alignjustify | indent outdent | bullist numlist | searchreplace code removeformat restoredraft',
    autosave_ask_before_unload: false,
    // images_upload_url: '/file/upload',
    // images_upload_base_path: '/file',
    images_upload_handler: (blobInfo: IBlobInfo) => imageUpload(blobInfo.blob()),
    resize: true,
    min_height: 160,

    content_css:'/editor.css',

    file_picker_types: 'image media',
    images_file_types: 'jpeg,jpg,jpe,jfi,png,gif,webp,avif,jxl',
    //*
    setup: (_editor) => {
      editor = _editor;
      _editor.ui.registry.addButton('uploadImageRu', {
        text: '바로 업로드',
        onAction: async () => {
          await tick();
          fileUploader.click();
          // console.log(editor);
        },
      });
    }, // */
  };

  const darkEditorSettings = {
    ...defaultEditorSettings,
    skin: 'oxide-dark',
    content_css: 'dark',
  };

  interface IBlobInfo {
    base64: () => any;
    blob: () => File;
    blobUri: () => any;
    filename: () => any;
    id: () => any;
    name: () => any;
    uri: () => any;
  }

  let unsub: () => void;
  onMount(() => {
    titleInput?.focus();

    unsub = f.subscribe(async (file) => {
      if (!file) return;
      const url = await imageUpload(file);
      insertImage(url);
    });
  });

  onDestroy(() => {
    if (unsub) {
      unsub();
    }
  });

  async function update() {
    if (updating) {
      return;
    }

    updating = true;

    try {
      const updateData = {
        title,
        content,
        tags,
      }

      await ky.post(`/community/${board}/${article}/api/edit`, {
        json: updateData,
      });

      await goto(`/community/${board}/${article}`);
    } catch (e) {
      console.error(e);
    } finally {
      updating = false;
    }
  }

</script>

<svelte:head>
  <title>{name} - {title} 수정 중</title>
</svelte:head>

<div class="hidden">
  <input type="file" bind:this={fileUploader} on:change={fileSelected}/>
</div>

<div class="mt-10 w-10/12 md:w-4/6 lg:w-3/5 mx-auto space-y-4">
  <input bind:this={titleInput}
         class="px-4 py-2 w-full outline outline-sky-400 dark:outline-sky-800 rounded-md dark:bg-gray-200 dark:text-gray-800"
         type="text" placeholder="제목" bind:value={title}/>

  <input class="px-4 py-1 w-full outline outline-zinc-400 dark:outline-zinc-800 rounded-md dark:bg-gray-200 dark:text-gray-800"
         type="text" placeholder="출처" bind:value={source} />
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
                bind:value={content}/>
      {/if}
    </div>
  </div>
  <div class="text-sm">
    <div id="__tags" class="space-x-2 inline-block">
      {#each tags as tag}
        <span class="rounded-md bg-zinc-100 dark:bg-gray-700 px-2 py-1 cursor-default"
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
    <button on:click={update} class:cursor-not-allowed={updating}
            class="items-center flex-grow bg-sky-400 dark:bg-sky-800 rounded-md text-white py-2">
      {#if updating}
        전송 중...
      {:else}
        이렇게 수정
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