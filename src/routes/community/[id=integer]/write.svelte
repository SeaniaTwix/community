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

    if (!session.user) {
      try {
        sessionStorage.setItem('ru.hn:back', `/community/${params.id}/write`);
      } catch {
        //
      }

      return {
        status: HttpStatus.MOVED_TEMPORARILY,
        redirect: '/login',
      };
    }

    const nr = await fetch(`/community/${params.id}/api/info`);
    const {name} = await nr.json();

    const tagRes = await fetch(`/community/${params.id}/api/write`);
    const {tags} = await tagRes.json();


    return {
      status: 200,
      props: {
        board: params.id,
        editorKey: key,
        name,
        usedTags: tags,
      },
    };
  }
</script>
<script lang="ts">
  import Plus from 'svelte-material-icons/Plus.svelte';
  import Delete from 'svelte-material-icons/Delete.svelte';
  import _, {isEmpty, uniq} from 'lodash-es';
  import type {ArticleDto} from '$lib/types/dto/article.dto';
  import ky from 'ky-universal';
  import {goto} from '$app/navigation';
  import Editor from '@tinymce/tinymce-svelte';
  import {onDestroy, onMount, tick} from 'svelte';
  import {theme} from '$lib/stores/shared/theme';
  import {writable} from 'svelte/store';
  import type {Editor as TinyMCE, Events} from 'tinymce';
  import Tag from '$lib/components/Tag.svelte';
  import {upload as imageUpload} from '$lib/file/uploader';
  import {defaultEditorSettings, darkThemes} from '$lib/editor/settings';

  type CommandEvent = Events.CommandEvent;

  const f = writable<File>(null);

  export let editorKey: string;
  export let board: string;
  export let name: string;
  export let usedTags: string[] = [];

  $: dark = $theme.mode === 'dark';
  $: appendableTags = usedTags.filter(tag => !tags.find(t => t === tag));


  const settings = {
    ...defaultEditorSettings,
    images_upload_handler: async (blobInfo) => {
      fileUploading = true;
      let link: string;
      try {
        link = await imageUpload(blobInfo.blob(), undefined, undefined);
        return link;
      } finally {
        fileUploading = false;
        if (link) {
          setTimeout(() => editor.insertContent('<p></p>'), 10);
        }
      }
    },
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
    },
  }

  const settingsDark = {
    ...settings,
    ...darkThemes,
  }



  // let editorObject: Editor;

  let titleInput: HTMLInputElement;
  let tagInput: HTMLInputElement;
  let fileUploader: HTMLInputElement;
  let editor: TinyMCE & {iframeElement: HTMLIFrameElement};
  let title = '';
  let content = '';
  let source = '';
  let tag = '';
  let tags = [];
  let editorLoaded = false;
  let registeredAutoTag: string | undefined;

  let addMode = false;

  let uploading = false;
  let fileUploading = false;

  function fileSelected() {
    f.set(fileUploader.files[0]);
  }

  function insertImage(imageUrl: string) {
    editor.insertContent(`<img src="${imageUrl}" alt="uploaded-at-${new Date}" /><p></p>`);
  }

  function insertVideo(videoUrl: string) {
    editor.insertContent(
      `<video controls width="560" height="360" preload="metadata" muted>
         <source src="${videoUrl}" type="video/webm" />
         사용 중이신 브라우저는 비디오 태그가 지원되지 않습니다.
       </video><p></p>`
    )
  }

  async function upload() {
    if (uploading) {
      return;
    }

    uploading = true;

    await new Promise((resolve) => {
      const i = setInterval(() => {
        if (!fileUploading) {
          clearInterval(i);
          return resolve();
        }
      }, 100);
    });

    addSizeAllImages();

    try {
      const data: ArticleDto<string[]> = {
        views: 0,
        board,
        title,
        source,
        content, //editorObject.getHTML(),
        tags,
        images: false,
      };

      const response = await ky.post(`/community/${board}/api/write`, {
        json: data,
      });

      const {id} = await response.json<{ id: string }>();

      await goto(`/community/${board}/${id}`);
    } finally {
      uploading = false;
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

  function addTag(tag: string) {
    tags = _.uniq([...tags, ...tag.trim().split(' ').filter(isNotEmpty)]).slice(0, 20);
  }

  function detectEnter(event: KeyboardEvent) {

    if (event.isComposing || event.keyCode === 229) {
      return;
    }
    if (event.key === 'Enter') {
      addTag(tag);
      tag = '';
    }
  }

  function deleteTag(target: string) {
    tags = tags.filter(v => v !== target);
  }

  function deleteAllTags() {
    tags = [];
  }

  function defaultEditorResized(event: CustomEvent) {
    //
  }

  function detectPaste(event: KeyboardEvent, type: 'down' | 'up') {
    console.log(type, event);
  }

  const autoTag = /^[[(]?([a-zA-Z가-힣@]+?)[\])]/gm;

  async function detectAutoTag(event: KeyboardEvent) {
    const index = Math.max(title.indexOf(')'), title.indexOf(']'));
    if (registeredAutoTag && index < 0) {
      tags = uniq(tags.filter(t => t !== registeredAutoTag));
      registeredAutoTag = undefined;
      return;
    }

    let resultAutoTag = autoTag.exec(title);
    if (!resultAutoTag) {
      // what? idk.
      resultAutoTag = autoTag.exec(title);
    }
    if (resultAutoTag) {
      if (registeredAutoTag) {
        tags = uniq(tags.filter(t => t !== registeredAutoTag));
      }

      registeredAutoTag = resultAutoTag[1];
      tags = uniq([registeredAutoTag, ...tags].slice(0, 20));
    }
  }

  function addSizeAllImages() {
    const imgs = editor.iframeElement.contentWindow.document.querySelectorAll('img');
    for (const img of imgs) {
      if (isEmpty(img.getAttribute('width'))) {
        img.width = img.naturalWidth;
      }
      if (isEmpty(img.getAttribute('height'))) {
        img.height = img.naturalHeight;
      }
    }

    // force refresh content to editor
    editor.insertContent('');
  }

  let unsub: () => void;
  onMount(() => {
    titleInput.focus();

    unsub = f.subscribe(async (file) => {
      if (!file) return;
      // noinspection TypeScriptUnresolvedFunction
      if (!['image', 'video'].includes(file.type.split('/')[0])) {
        return;
      }
      fileUploading = true;
      try {
        const url = await imageUpload(file);
        if (file.type.startsWith('video')) {
          insertVideo(url);
        } else {
          insertImage(url);
        }
      } finally {
        fileUploading = false;
      }
    });
  });

  onDestroy(() => {
    if (unsub) {
      unsub();
    }
  });

</script>

<svelte:head>
  <title>게시판 - {name} - 새 글 쓰기</title>
</svelte:head>

<div class="hidden">
  <input type="file" bind:this={fileUploader} on:change={fileSelected}/>
</div>

<div class="__mobile-bottom-fix mt-10 w-10/12 md:w-4/6 lg:w-3/5 mx-auto space-y-4">
  <div class="px-4 py-2 w-full outline outline-sky-400 dark:outline-sky-800 rounded-md bg-zinc-50/50 dark:bg-gray-200 dark:text-gray-800 shadow-md">
    <input bind:this={titleInput} on:keyup={detectAutoTag}
           class="bg-transparent w-full outline-none"
           type="text" placeholder="제목" bind:value={title}/>
  </div>
  <div class="px-4 py-1 w-full outline outline-zinc-400 dark:outline-zinc-800 rounded-md bg-zinc-50/50 dark:bg-gray-200 dark:text-gray-800 shadow-md">
    <input
      class="bg-transparent w-full outline-none"
      type="text" placeholder="출처" bind:value={source}/>
  </div>
  <div class="min-h-[25rem]">
    {#if !editorLoaded}
      에디터 초기화 중...
    {/if}
    <div class:hidden={!editorLoaded}>
      {#if dark}
        <Editor on:init={() => (editorLoaded = true)}
                apiKey="{editorKey}"
                conf="{settingsDark}"
                bind:value={content}
                on:resizeeditor={console.log}
                on:keydown={(e) => detectPaste(e, 'down')}
                on:keyup={(e) => detectPaste(e, 'up')}/>
      {:else}
        <Editor on:init={() => (editorLoaded = true)}
                apiKey="{editorKey}"
                conf="{settings}"
                bind:value={content}/>
      {/if}
    </div>
  </div>
  <div class="text-sm space-y-2">
    {#if isNotEmpty(tags)}
      <p>
        {#if registeredAutoTag}
          자동 태그가 활성화 되었습니다. 자동 태그를 포함해
        {/if}
        태그는 최대 20개까지 등록할 수 있습니다. <button on:click={deleteAllTags} class="text-red-600">모든 태그 삭제</button>
      </p>
    {/if}
    <ul id="__tags" class="inline-block flex flex-wrap space-x-2">
      {#each tags as tag}
        <li class="inline-block">
          <Tag>
            {tag}
            <span class="cursor-pointer"
                  on:click={() => deleteTag(tag)}><Delete size="1rem"
                                                          color="rgb(248, 113, 113)"/></span>
          </Tag>

        </li>
      {/each}
      <li class="inline-block" on:click={addTagClicked}>
        <Tag>
          {#if addMode}
            <input bind:this={tagInput} bind:value={tag} type="text" placeholder="태그를 입력하세요... (띄어쓰기로 구분)"
                   on:keydown={detectEnter} class="bg-transparent w-fit min-w-[14rem] focus:outline-none"/>
          {:else}
            <Plus size="1rem"/>
            새 태그 추가
          {/if}
        </Tag>
      </li>
    </ul>
    {#if !isEmpty(appendableTags)}
      <div class="space-y-2 pt-4">
        <h3 class="text-lg">내가 자주 사용하는 태그...</h3>
        <ol class="space-x-2 text-xs">
          {#each appendableTags as usedTag}
            <li class="inline-block mb-2 text-zinc-500 dark:text-zinc-300">
              <span on:click={() => addTag(usedTag)} class="cursor-pointer">
                <Tag><Plus />{usedTag}</Tag>
              </span>
            </li>
          {/each}
        </ol>
      </div>
    {/if}
  </div>
  <div class="flex space-x-2">
    <button on:click={upload} class:cursor-not-allowed={uploading}
            class="items-center flex-grow bg-sky-400 dark:bg-sky-800 rounded-md text-white py-2 shadow-md">
      {#if uploading}
        전송 중...
      {:else}
        작성 완료
      {/if}
    </button>
    <a href="/community/{board}"
       class="inline-block items-center bg-red-400 dark:bg-red-800 px-4 py-2 text-white rounded-md shadow-md">
      취소
    </a>
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

  // ios bottom gap
  // noinspection CssOverwrittenProperties
  .__mobile-bottom-fix {
    margin-bottom: 1rem;
    // noinspection CssInvalidFunction
    margin-bottom: constant(safe-area-inset-bottom);
    margin-bottom: env(safe-area-inset-bottom);
  }
</style>