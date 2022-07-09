<script lang="ts">
  import {tick} from 'svelte';
  import {isEmpty} from 'lodash-es';
  import CircleAvatar from '$lib/components/CircleAvatar.svelte';

  let file: HTMLInputElement;
  let files: FileList;
  let fileDragging = false;
  let imageUrl = '';
  let imageType = '';

  function t() {
    console.log(file);


  }

  function fileDrag(event: DragEvent) {
    if (event.dataTransfer.types.includes('Files')) {
      fileDragging = true;
    }
  }

  function fileDragLeaveCheck(event: DragEvent) {
    fileDragging = false;
  }

  async function fileDrop(event: DragEvent) {
    await tick();
    fileDragging = false;
    const uploadPending = event.dataTransfer.files.item(0);
    if (uploadPending.type.startsWith('image')) {
      imageUrl = URL.createObjectURL(uploadPending);
      imageType = uploadPending.type;
    }
  }

</script>
<div class="w-4/6 sm:w-2/3 md:w-1/2 lg:w-1/3 mx-auto space-y-4">
  <div><input type="file" bind:this={file} bind:files={files} /></div>
  <button on:dragover|preventDefault={fileDrag}
          on:dragleave|preventDefault={fileDragLeaveCheck}
          on:drop|preventDefault={fileDrop}
          class="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 rounded-md shadow-md"
          on:click={t}>
    {#if fileDragging}
      놓아주세요!
    {:else}
      여기 위로 끌어다놓거나 이곳을 눌러 아바타 업로드
    {/if}
  </button>
  {#if !isEmpty(imageUrl)}
    <h2>미리보기</h2>

    <div class="w-16 inline-block">
      <CircleAvatar fallback="{{src: imageUrl, type: imageType}}" />
    </div>

    <div class="w-10 inline-block">
      <CircleAvatar fallback="{{src: imageUrl, type: imageType}}" />
    </div>

    <button class="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 rounded-md shadow-md">
      이미지 편집
    </button>
  {/if}
</div>