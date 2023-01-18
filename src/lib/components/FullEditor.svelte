<script lang="ts">
  import Plus from 'svelte-material-icons/Plus.svelte';
  import Delete from 'svelte-material-icons/Delete.svelte';
  import _, {isEmpty, uniq} from 'lodash-es';
  import Editor from '@tinymce/tinymce-svelte';
  import type {Editor as TinyMCE} from 'tinymce';
  import Tag from '$lib/components/Tag.svelte';
  import {upload as imageUpload} from '$lib/file/uploader';
  import {defaultEditorSettings, darkThemes} from '$lib/editor/settings';
  import {theme} from '../stores/shared/theme';
  import ky from 'ky-universal';
  import {onDestroy, onMount, tick} from 'svelte';
  import {ArticleDto} from '../types/dto/article.dto';
  import {goto} from '$app/navigation';
  import {writable} from 'svelte/store';
  import type {Unsubscriber} from 'svelte/store';
  import {fade} from 'svelte/transition';
  import {load} from 'cheerio';
  import {client} from '$lib/auth/user/client';
  import {page} from '$app/stores';

  let titleInput: HTMLInputElement;
  let tagInput: HTMLInputElement;
  let fileUploader: HTMLInputElement;
  let videoUploader: HTMLInputElement;
  let editor: TinyMCE & { iframeElement: HTMLIFrameElement };
  export let title = '';
  export let content = '';
  export let source = '';
  let tag = '';
  export let tags: string[] = [];
  let editorLoaded = false;
  let registeredAutoTag: string | undefined;
  let adultTagError = false;

  let addMode = false;

  let uploading = false;
  let uploadingExternalLinks = false;
  // let fileUploading = false;
  let fileUploadingCount = 0;


  export let editorKey: string;
  export let article: string;
  export let usedTags: string[] = [];
  export let isEditMode = false;
  export let tagCounts = 0;

  $: dark = $theme.mode === 'dark';
  $: appendableTags = usedTags.filter(tag => !tags.find(t => t === tag));

  let detectedExternalLinks = false;
  let detectedExternalLinksCount = 0;

  $: leftTagCount = 30 - tags.length - tagCounts;

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

      if (!$client?.user?.adult === true && registeredAutoTag.trim() === '성인') {
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
        icon: 'upload',
        text: '이미지',
        onAction: async () => {
          await tick();
          fileUploader.click();
          // console.log(editor);
        },
      });
      _editor.ui.registry.addButton('uploadVideoRu', {
        icon: 'upload',
        text: '동영상',
        onAction: async () => {
          await tick();
          videoUploader.click();
        }
      })
    },
  };

  const settingsDark = {
    ...settings,
    ...darkThemes,
  };


  function isNotEmpty(o) {
    return !_.isEmpty(o);
  }

  function addTag(tag: string) {
    if (!$client?.user?.adult === true && tag.trim() === '성인') {
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

  function getExteranlImages() {
    const imgs = editor.iframeElement.contentWindow.document.querySelectorAll('img');
    return Array.from(imgs).filter(image => !image.src.startsWith('https://s3.ru.hn'));
  }

  function setToNaturalSize(img: HTMLImageElement) {
    if (isEmpty(img.getAttribute('width'))) {
      if (img.naturalWidth > 0) {
        img.width = img.naturalWidth;
      }
    }
    if (isEmpty(img.getAttribute('height'))) {
      if (img.naturalHeight > 0) {
        img.height = img.naturalHeight;
      }
    }
  }

  async function addSizeAllImages() {
    const imgs = editor.iframeElement.contentWindow.document.querySelectorAll('img');
    for (const img of imgs) {
      if (img.naturalWidth + img.naturalHeight <= 0) {
        await new Promise(resolve => {
          img.addEventListener('load', () => {
            setToNaturalSize(img);
            resolve();
          });
        });
      } else {
        setToNaturalSize(img);
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

    const externalImages = getExteranlImages();
    detectedExternalLinks = !isEmpty(externalImages);

    if (detectedExternalLinks) {
      detectedExternalLinksCount = externalImages.length;
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

    editor.selection.setCursorLocation();

    await addSizeAllImages();

    try {

      if (isEditMode) {

        const updateData = {
          title,
          content,
          source,
          tags,
        };

        await ky.post(`/community/${$page.params.id}/${article}/api/edit`, {
          json: updateData,
        });

        await goto(`/community/${$page.params.id}/${article}`);


      } else {


        const data: Partial<ArticleDto<string[]>> = {
          views: 0,
          board: $page.params.id,
          title,
          source,
          content, //editorObject.getHTML(),
          tags,
          // images: false,
        };

        const response = await ky.post(`/community/${$page.params.id}/api/write`, {
          json: data,
        });

        const {id} = await response.json<{ id: string }>();

        await goto(`/community/${$page.params.id}/${id}`);
      }

    } finally {
      uploading = false;
    }
  }

  const f = writable<File[] | null>(null);
  const v = writable<File | null>(null);

  function fileSelected() {
    f.set(Array.from(fileUploader.files));
  }

  function videoSelected(event: Event) {
    if (event.target instanceof HTMLInputElement) {
      v.set(event.target.files.item(0));
    }
  }

  function insertImage(links: string[]) {
    const images = links
      .map((link) => `<img src="${link}" alt="uploaded at ${new Date}" />`)
      .join('');
    const template = `
      <p>
        ${images}
      </p>
      <p>&nbsp;</p>`;
    editor.insertContent(template);
  }

  function insertVideo(endpoint: string, uid: string) {
    const thumbUrl = encodeURIComponent(`${endpoint}/${uid}/thumbnails/thumbnail.jpg?time=&height=600`);
    editor.insertContent(
      `<div style="position: relative; padding-top: 56.25%;">
       <iframe src="${endpoint}/${uid}/iframe?poster=${thumbUrl}" style="border: none; position: absolute; top: 0; left: 0; height: 100%; width: 100%;" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowfullscreen="true"></iframe>
       </div>`);
  }

  let unsubs: Unsubscriber[] = [];

  onMount(() => {
    unsubs.push(f.subscribe(async (files) => {
      if (Array.isArray(files)) {
        files = files.filter(({type}) => {
          const isTypeExists = typeof type === 'string';
          const isImageOrVideo = type.startsWith('video') || type.startsWith('image');
          return isTypeExists && isImageOrVideo;
        });

        const uploads = files.map(async f => await imageUpload(f, undefined, undefined));
        const uploaded: PromiseSettledResult<string>[] = await Promise.allSettled(uploads);
        const fulfilled = uploaded
          .filter(v => v.status === 'fulfilled')
          .map((v: PromiseFulfilledResult<string>) => v.value);
        const rejected = uploaded
          .filter(v => v.status === 'rejected');
        insertImage(fulfilled);
        console.error(rejected);
      }
    }));

    unsubs.push(v.subscribe(async (video) => {
      if (video instanceof File) {
        uploading = true;

        try {
          const {result, endpoint} = await ky.post(`/file/video/upload`).json<IRequestVideoUploadUrlResponse>();

          const body = new FormData;
          body.set('file', video);

          await ky.post(result.uploadURL, {body});

          insertVideo(endpoint, result.uid);
        } catch (e) {
          console.trace(e);
        } finally {
          uploading = false;
        }
      }
    }));
  });

  interface IRequestVideoUploadUrlResponse {
    result: {
      uploadURL: string;
      uid: string;
      watermark: string | null;
    };
    success: boolean;
    errors: unknown[];
    messages: unknown[];
    endpoint: string;
  }

  onDestroy(() => {
    for (const unsub of unsubs) {
      unsub();
    }
  });

  async function uploadAllImagesToS3AndPost() {
    uploadingExternalLinks = true;

    try {
      editor.selection.setCursorLocation();

      closeExternalLinkWarning();

      const $ = load(content);

      // @ts-ignore
      const imgs = $('img');

      const reqs = imgs.toArray()
        .filter((img: typeof img) => img.attribs.src && !img.attribs.src.startsWith('https://s3.ru.hn'))
        .map(async (img: typeof img) => {
          const {uploadedLink} = await ky.post('/file/upload/', {
            json: {
              src: img.attribs?.src,
            }
          }).json<{ uploadedLink: string }>()
          $(img).attr('src', uploadedLink);
        });

      await Promise.all(reqs);

      // @ts-ignore
      content = $('body').html() ?? '';
      // editor.insertContent('<p>&nbsp;</p>')
    } finally {

      setTimeout(() => {
        upload();
        uploadingExternalLinks = false;
      }, 150);
    }

     // upload().then();
  }

  function closeExternalLinkWarning() {
    detectedExternalLinks = false;
  }

</script>

<div class="hidden">
  <input type="file"
         multiple
         accept="{defaultEditorSettings.images_file_types.split(',').map(v => `.${v}`).join(',')}"
         bind:this={fileUploader}
         on:change={fileSelected}/>
  <input type="file"
         accept="MP4, MKV, MOV, AVI, FLV, MPEG-2 TS, MPEG-2 PS, MXF, LXF, GXF, 3GP, WebM, MPG,"
         bind:this={videoUploader}
         on:change={videoSelected}/>
</div>

{#if uploading || uploadingExternalLinks}
  <div transition:fade class="fixed top-0 left-0 bg-zinc-200/50 w-full h-full z-20 backdrop-blur-md">
    <div class="absolute w-fit px-4 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 rounded-md shadow-md bg-zinc-700/60 p-4 text-zinc-100">
      업로드 중
    </div>
  </div>
{/if}

{#if detectedExternalLinks}
  <div class="fixed top-0 left-0 bg-zinc-200/50 w-full h-full z-20 backdrop-blur-md">
    <div class="absolute w-fit px-4 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 rounded-md shadow-md bg-zinc-700/60 p-4 text-zinc-100">
      <h2 class="text-xl text-center font-bold mb-2">
        {detectedExternalLinksCount}개의 외부 이미지가 감지되었습니다.
      </h2>
      <p>모두 루헨을 통해 업로드 한 다음 진행할까요?</p>
      <p class="text-red-200 rounded-md bg-zinc-400/20 p-2">
        경고: 루헨은 저작권 관련 검사를 자동적으로 하지 않으며, 저작권 침해가 적발되어 고발당할 시 책임은 본인에게 있습니다.
      </p>
      <div class="flex flex-row gap-2 mt-2">
        <button on:click={uploadAllImagesToS3AndPost} class="flex-grow bg-sky-400 rounded-md shadow-md px-4 py-2">
          네, 위 경고를 읽었고 이해했으며, 루헨으로 자동 업로드 한 다음 게시글을 올릴게요.
        </button>
        <button on:click={closeExternalLinkWarning} class="flex-grow bg-red-400 rounded-md shadow-md px-4 py-2">
          아뇨. 조금 더 생각해볼게요.
        </button>
      </div>
    </div>
  </div>
{/if}

<div class="space-y-4">
  <div
    class="px-4 py-2 w-full outline outline-sky-400 dark:outline-sky-800 rounded-md bg-zinc-50/50 dark:bg-gray-200 dark:text-gray-800 shadow-md">
    <input bind:this={titleInput} on:keyup={detectAutoTag} maxlength="48"
           class="bg-transparent w-full outline-none"
           type="text" placeholder="제목" bind:value={title}/>
  </div>
  <div
    class="px-4 py-1 w-full outline outline-zinc-400 dark:outline-zinc-800 rounded-md bg-zinc-50/50 dark:bg-gray-200 dark:text-gray-800 shadow-md">
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
                bind:value={content}/>
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
        태그는 최대 30개까지 등록할 수 있습니다.
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
    <ul id="__tags" class="inline-block flex flex-row flex-wrap gap-2">
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
      <li class="inline-block flex flex-row items-center gap-1" on:click={addTagClicked}>
        <Tag>
          {#if addMode}
            <input bind:this={tagInput} bind:value={tag} type="text" placeholder="태그를 입력하세요... (띄어쓰기로 구분)"
                   on:keydown={detectEnter} class="bg-transparent w-fit min-w-[14rem] focus:outline-none"/>
          {:else}
            <Plus size="1rem"/>
            새 태그 추가 ({leftTagCount})
          {/if}
        </Tag>
        {#if addMode}
          <span>({leftTagCount}) 개의 태그 등록 가능</span>
        {/if}
      </li>
    </ul>
    {#if !isEmpty(appendableTags)}
      <div class="space-y-2 pt-4">
        <h3 class="text-lg">내가 자주 사용하는 태그...</h3>
        <ol class="space-x-2 text-xs">
          {#each appendableTags as usedTag}
            <li class="inline-block mb-2 text-zinc-500 dark:text-zinc-300">
              <span on:click={() => addTag(usedTag)} class="cursor-pointer">
                <Tag><Plus/>{usedTag}</Tag>
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
        {#if isEditMode}
          이렇게 수정
        {:else}
          작성 완료
        {/if}
      {/if}
    </button>
    <a href="/community/{$page.params.id}"
       class="inline-block items-center bg-red-400 dark:bg-red-800 px-4 py-2 text-white rounded-md shadow-md">
      게시판으로 돌아가기
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