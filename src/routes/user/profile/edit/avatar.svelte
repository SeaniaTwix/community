<script lang="ts">
  import {onDestroy, tick} from 'svelte';
  import {isEmpty, last} from 'lodash-es';
  import CircleAvatar from '$lib/components/CircleAvatar.svelte';
  import EditImage from '$lib/components/EditImage.svelte';
  import ky from 'ky-universal';
  import {session} from '$app/stores'

  let file: HTMLInputElement;
  let files: FileList;
  let fileDragging = false;
  let imageType = '';
  let showingImageEditor = false;
  let editAvatarSrc = '';
  let editedAvatar: Blob;
  let isEdited = false;
  let history: string[] = [];
  let preview = {
    src: null,
    type: null,
  }

  function openImageEditor() {
    showingImageEditor = true;
  }

  function closeImageEditor() {
    showingImageEditor = false;
  }

  async function imageEditedInComment(event: CustomEvent<Blob>) {
    editAvatarSrc = URL.createObjectURL(event.detail);
    history = [...history, editAvatarSrc];
    editedAvatar = event.detail;
    isEdited = true;
    await tick();
    closeImageEditor();
  }

  function t() {
    console.log(file);


  }

  function fileDrag(event: DragEvent) {
    // noinspection TypeScriptUnresolvedFunction
    if (event.dataTransfer.types.includes('Files')) {
      fileDragging = true;
    }
  }

  function fileDragLeaveCheck(event: DragEvent) {
    fileDragging = false;
  }

  function imageSelected() {
    isEdited = false;
  }

  async function fileDrop(event: DragEvent) {
    imageSelected();
    await tick();
    fileDragging = false;
    const uploadPending = event.dataTransfer.files.item(0);
    if (uploadPending.type.startsWith('image')) {
      editAvatarSrc = URL.createObjectURL(uploadPending);
      imageType = uploadPending.type;
      history = [...history, editAvatarSrc];
    }
  }

  async function uploadAvatar() {
    const {prefix, presigned} = await ky.get('/user/profile/api/avatar')
      .json<IUploadRequestResult>();

    const body = new FormData();

    const key = prefix + (isEdited ? 'png' : files[0].type.split('/')[1]);
    body.set('key', key);
    body.set('acl', 'public-read');
    body.set('Content-Type', isEdited ? 'image/png' : files[0].type);
    // body.set('bucket', request.bucket);
    for (const key of Object.keys(presigned.fields)) {
      body.set(key, presigned.fields[key]);
    }

    const blob = await ky.get(editAvatarSrc).blob();

    body.append('file', blob);
    // console.log(file.type);
    await ky.post('https://s3.ru.hn', {body});
    await saveAvatar(`https://s3.ru.hn/${key}`);
  }

  function fileSelected() {
    editedAvatar = files[0];
    editAvatarSrc = URL.createObjectURL(editedAvatar);
  }

  async function saveAvatar(link: string) {
    await ky.post('/user/profile/api/avatar', {
      json: {link,}
    });
  }

  function undo() {
    const newHistory = [...history];
    const removed = newHistory.pop();
    if (removed.startsWith('blob:')) {
      URL.revokeObjectURL(removed);
    }
    editAvatarSrc = last(newHistory);
    history = newHistory;
  }

  onDestroy(() => {
    for (const src of history) {
      if (src.startsWith('blob:')) {
        URL.revokeObjectURL(src);
      }
    }
  })

  interface IUploadRequestResult {
    prefix: string;
    presigned: {
      url: string,
      fields: Record<string, string>
    };
  }
</script>

{#if showingImageEditor}

  <EditImage on:close={closeImageEditor} on:save={imageEditedInComment} bind:src="{editAvatarSrc}" />

{/if}

<div class="w-4/6 sm:w-2/3 md:w-1/2 lg:w-1/3 mx-auto space-y-4">
  <div class="hidden"><input type="file" bind:this={file} bind:files={files} on:change={fileSelected} /></div>
  <button on:dragover|preventDefault={fileDrag}
          on:dragleave|preventDefault={fileDragLeaveCheck}
          on:drop|preventDefault={fileDrop}
          class="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 rounded-md shadow-md min-h-[8rem]"
          on:click={() => {file.click(); imageSelected();}}>
    {#if fileDragging}
      놓아주세요!
    {:else}
      여기 위로 끌어다놓거나 이곳을 눌러 아바타 선택
    {/if}
  </button>
  {#if !isEmpty(editAvatarSrc)}
    <h2>미리보기</h2>

    <div class="w-16 inline-block">
      <CircleAvatar fallback="{{src: editAvatarSrc, type: imageType}}" />
    </div>

    <div class="w-10 inline-block">
      <CircleAvatar fallback="{{src: editAvatarSrc, type: imageType}}" />
    </div>

    <button on:click={openImageEditor} class="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 rounded-md shadow-md">
      이미지 편집
    </button>

    {#if history.length > 1}
      <button on:click={undo} class="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 rounded-md shadow-md">
        되돌리기
      </button>
    {/if}

    <button on:click={uploadAvatar} class="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 rounded-md shadow-md">
      업로드
    </button>
  {/if}
</div>