<script lang="ts">
  import Plus from 'svelte-material-icons/Plus.svelte';
  import Delete from 'svelte-material-icons/Delete.svelte';
  import _, {isEmpty, uniq} from 'lodash-es';
  import {session} from '$app/stores';
  import Editor from '@tinymce/tinymce-svelte';
  import type {Editor as TinyMCE, Events} from 'tinymce';
  import Tag from '$lib/components/Tag.svelte';
  import {upload as imageUpload} from '$lib/file/uploader';
  import {defaultEditorSettings, darkThemes} from '$lib/editor/settings';
  import {theme} from '../stores/shared/theme';
  import ky from 'ky-universal';
  import {tick} from 'svelte';
  import {ArticleDto} from '../types/dto/article.dto';
  import {goto} from '$app/navigation';

  let titleInput: HTMLInputElement;
  let tagInput: HTMLInputElement;
  let fileUploader: HTMLInputElement;
  let editor: TinyMCE & {iframeElement: HTMLIFrameElement};
  export let title = '';
  export let content = '';
  export let source = '';
  let tag = '';
  export let tags = [];
  let editorLoaded = false;
  let registeredAutoTag: string | undefined;
  let adultTagError = false;

  let addMode = false;

  let uploading = false;
  // let fileUploading = false;
  let fileUploadingCount = 0;


  export let editorKey: string;
  export let board: string;
  export let usedTags: string[] = [];
  export let isEditMode = false;

  $: dark = $theme.mode === 'dark';
  $: appendableTags = usedTags.filter(tag => !tags.find(t => t === tag));


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

      if (!$session.user.adult && registeredAutoTag.trim() === '성인') {
        registeredAutoTag = undefined;
        return adultTagError = true;
      } else {
        adultTagError = false;
      }

      tags = uniq([registeredAutoTag, ...tags].slice(0, 20));
    }
  }

  const settings = {
    ...defaultEditorSettings,
    //*
    images_upload_handler: async (blobInfo, success, failure) => {
      // fileUploading = true;
      fileUploadingCount++;
      let link: string;
      try {
        link = await imageUpload(blobInfo.blob(), undefined, undefined);
        // prevent blink when real url fetched
        await ky.get(link);
        success(link);
        return link;
      } catch (e) {
        failure(e);
      } finally {
        // fileUploading = false;
        fileUploadingCount--;
      }
    }, // */
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


  function isNotEmpty(o) {
    return !_.isEmpty(o);
  }

  function addTag(tag: string) {
    if (!$session.user.adult && tag.trim() === '성인') {
      return adultTagError = true;
    } else {
      adultTagError = false;
    }
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

  function addTagClicked() {
    if (!addMode) {
      addMode = true;
      setTimeout(() => tagInput.focus(), 10);
    }
  }


  async function upload() {
    if (uploading) {
      return;
    }

    uploading = true;

    await new Promise((resolve) => {
      const i = setInterval(() => {
        if (fileUploadingCount === 0) {
          clearInterval(i);
          return resolve();
        }
      }, 100);
    });

    // todo: check image src is all changed
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

    addSizeAllImages();

    try {

      if (isEditMode) {

        const updateData = {
          title,
          content,
          source,
          tags,
        }

        await ky.post(`/community/${board}/${article}/api/edit`, {
          json: updateData,
        });

        await goto(`/community/${board}/${article}`);


      } else {

        
        const data: Partial<ArticleDto<string[]>> = {
          views: 0,
          board,
          title,
          source,
          content, //editorObject.getHTML(),
          tags,
          // images: false,
        };

        const response = await ky.post(`/community/${board}/api/write`, {
          json: data,
        });

        const {id} = await response.json<{ id: string }>();

        await goto(`/community/${board}/${id}`);
      }

    } finally {
      uploading = false;
    }
  }

</script>

<div class="space-y-4">
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
                bind:value={content} />
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
        태그는 최대 20개까지 등록할 수 있습니다.
        {#if tags.includes('성인')}
          <span class="text-red-600">성인 태그가 활성화되었습니다.</span>
        {:else if adultTagError}
          <span class="text-red-600">성인 태그는 성인인증을 한 사람만 추가 할 수 있습니다.</span>
        {/if}
        <button on:click={deleteAllTags} class="text-red-600">모든 태그 삭제</button>
      </p>
    {:else}
      {#if adultTagError}
        <span class="text-red-600">성인 태그는 성인인증을 한 사람만 추가 할 수 있습니다.</span>
      {/if}
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