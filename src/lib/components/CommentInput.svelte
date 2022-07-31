<script lang="ts">
  import Upload from 'svelte-material-icons/Upload.svelte';
  import Favorite from 'svelte-material-icons/Star.svelte';
  import Delete from 'svelte-material-icons/TrashCan.svelte';
  import Close from 'svelte-material-icons/Close.svelte';
  import Goto from 'svelte-material-icons/ArrowRightBold.svelte';

  import {fade} from 'svelte/transition';
  import {page, session} from '$app/stores';
  import type {IComment} from '$lib/types/comment';
  import {isEmpty} from 'lodash-es';
  import {createEventDispatcher, onMount, onDestroy} from 'svelte';
  import type {IUser} from '$lib/types/user';
  import Checkbox from './Checkbox.svelte';
  import ky from 'ky-universal';
  import {imageSrc} from '$lib/community/comment/client';
  import type {FavoriteImage} from '$lib/community/comment/client';

  const dispatch = createEventDispatcher();

  export let commenting = false;
  export let commentFolding = false;
  export let selectedComment: IComment;
  export let commentImageUploadSrc: string;
  export let smallImage: boolean;
  export let users: Record<string, IUser>;

  export let content = '';
  export let textInput: HTMLTextAreaElement;
  export let mobileTextInput: HTMLTextAreaElement;
  export let iosMode = false;

  let favoriteImageMode = false;

  let favorites: Record<string, FavoriteImage> = {};

  let imgSrcUnsub: () => void;
  onMount(() => {
    imgSrcUnsub = imageSrc.subscribe((image) => {
      if (image) {
        commentImageUploadSrc = image.src;
        imageSrc.set(undefined);
      }
    })
  });

  onDestroy(() => {
    if (typeof imgSrcUnsub === 'function') {
      imgSrcUnsub();
    }
  })

  function addComment() {
    if (isEmpty(content) && isEmpty($imageSrc)) {
      return;
    }

    dispatch('submit');
  }

  function cancelImageUpload() {
    dispatch('cancelimageupload');
  }

  function toggleCommentFold() {
    dispatch('togglefold');
  }

  function openImageEditor() {
    dispatch('openimageeditor');
  }

  function imageLoadCompletedInComment(element: HTMLImageElement) {
    URL.revokeObjectURL(element.src);
  }

  let escPressed = false;
  async function detectSendOrEsc(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      addComment();
      return;
    }

    escPressed = event.key === 'Escape';
  }

  async function detectEscReleased(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      escPressed = false;
    }
  }

  function onBlur() {
    dispatch('blur');
  }

  function enableMobileInput() {
    dispatch('mobilemode');
  }

  function loadFileDialog() {
    dispatch('selectfile');
  }

  async function toggleFavoriteImages() {
    favoriteImageMode = !favoriteImageMode;
    console.log(favoriteImageMode);

    if (favoriteImageMode) {
      const images = await ky.get('/user/favorite/image')
        .json<{favorites: Record<string, FavoriteImage>}>();

      favorites = images.favorites;

    }
  }

  async function favoriteImageSelected(fav: FavoriteImage) {
    dispatch('favoriteclick', {fav, disable: () => {favoriteImageMode = false;}});
    // commentImageUploadSrc = fav.src;
    // favoriteImageMode = false;
  }

</script>

{#if commenting}
  <div transition:fade
       class="absolute bg-zinc-300/50 dark:bg-white/40 w-full h-full z-10 rounded-t-md flex flex-col justify-center backdrop-blur-sm">
    <p class="text-center text-zinc-600 dark:text-gray-700">업로드 중...</p>
  </div>
{/if}

<div class:mt-4={iosMode} class:shadow-md={!iosMode} class="overflow-hidden rounded-t-md bg-gray-50/50 flex flex-col relative __comment-input">
  <div class:__ios-bottom-fix={commentFolding} class="px-2 flex flex-row {!selectedComment ? 'hover:bg-gray-200 dark:hover:bg-gray-300/80' : ''} items-center transition-all leading-zero space-x-1">

    {#if isEmpty(commentImageUploadSrc)}

      <button on:click={toggleFavoriteImages}
              class="{favoriteImageMode ? 'text-yellow-400 hover:text-yellow-500' : 'text-zinc-700 hover:text-zinc-900'} p-1 cursor-pointer transition-colors">
        <Favorite size="1.25rem"/>
      </button>
      <button on:click={loadFileDialog}
              class="text-zinc-700 hover:text-zinc-900 p-1 cursor-pointer transition-colors">
        <Upload size="1.25rem"/>
      </button>

    {:else}

      <button on:click={cancelImageUpload} class="text-zinc-700 hover:text-red-600 p-0.5 cursor-pointer mr-1">
        <span class="text-md items-center"><span class="align-middle"><Delete size="1.25rem"/></span>이미지 삭제</span>
      </button>

      <button on:click={() => smallImage = !smallImage} class="text-zinc-700 items-center">
        <Checkbox>작은 크기로</Checkbox>
      </button>

    {/if}

    {#if selectedComment && !iosMode}

      <div class="h-8 flex-grow flex flex-row justify-end text-lg text-zinc-600 dark:text-gray-700 cursor-default select-none w-0">
        <p class="inline-block flex flex-row min-w-0 pl-4">
          <span class="min-w-fit">{users[selectedComment.author].id}님의 "</span>
          <span class="truncate">{selectedComment.content}</span>
          <span class="min-w-fit">"에 답장 중...
            <a id="__goto-comment" class="hover:text-sky-400 dark:hover:text-sky-600" href="{$page.url.pathname}#c{selectedComment._key}">
              <Goto />
            </a>
            <button class="hover:text-red-500 dark:hover::text-red-600" on:click={() => (selectedComment = undefined)}>
              <Close />
            </button>
          </span>
        </p>
      </div>

    {:else}

      <button on:click={toggleCommentFold} class="h-8 flex-grow cursor-pointer items-center">
        <!-- Fold Toggle -->
      </button>

    {/if}
  </div>
  <div class="w-full flex flex-row grow shrink-0 {commentFolding ? 'h-0' : 'h-24'} transition-all">
    <div class="flex flex-grow" class:overflow-x-scroll={favoriteImageMode}>

      {#if !isEmpty(commentImageUploadSrc)}

        <div on:click={openImageEditor} class="flex-shrink-0 w-24 border-4 border-zinc-100 dark:border-gray-300/50 hover:border-sky-400 dark:hover:border-sky-500 cursor-pointer select-none">
          <img class="w-full h-full object-cover object-top bg-white dark:bg-gray-600" crossorigin="anonymous"
               on:load={imageLoadCompletedInComment}
               src="{commentImageUploadSrc}" alt="upload preview" />
        </div>

      {/if}

      <div class="bg-gray-100 dark:bg-gray-300 p-3 flex-grow shadow-md dark:text-gray-800 h-full relative">

        {#if !favoriteImageMode}
          {#if !iosMode}

          <textarea id="__textarea-general" class="w-full h-full bg-transparent focus:outline-none overflow-y-scroll overscroll-contain resize-none touch-none"
                    on:keydown={detectSendOrEsc}
                    on:keyup={detectEscReleased}
                    bind:this={textInput}
                    bind:value={content}
                    on:blur={onBlur}
                    placeholder="댓글을 입력하세요..."></textarea>
            <div id="__textarea-mobile"
                 on:click={enableMobileInput} on:dblclick|preventDefault
                 class="w-full h-full bg-transparent focus:outline-none overflow-y-scroll overscroll-contain resize-none touch-none">

              {#if isEmpty(content)}

                <span class="text-[#9DA3AE]">댓글을 입력하세요...</span>

              {:else}

                {content}

              {/if}

            </div>

          {:else}

          <textarea class="w-full h-full bg-transparent focus:outline-none overflow-y-scroll overscroll-contain resize-none"
                    on:keydown={detectSendOrEsc}
                    bind:value={content}
                    bind:this={mobileTextInput}
                    on:blur={onBlur}
                    placeholder="댓글을 입력하세요..."></textarea>

          {/if}

        {:else}

          <div class="flex flex-row h-full p-1 space-x-2">
            {#each Object.values(favorites) as fav, i}
              <div on:click={() => favoriteImageSelected(fav)} class="h-full overflow-hidden aspect-square w-auto rounded-md cursor-pointer hover:ring-2 ring-sky-400">
                <img class="w-full h-full object-cover object-top" src="{fav.src}" alt="{Object.keys(favorites)[i]}">
              </div>
            {/each}
          </div>

        {/if}

      </div>
    </div>
    {#if !iosMode && !favoriteImageMode}
      <button on:click={addComment} class="px-4 bg-sky-200 dark:bg-sky-800">

        {#if selectedComment}

          답글

        {/if}

        작성
      </button>
    {/if}
  </div>
</div>
{#if iosMode}
  <button on:click={addComment} class="rounded-b-md py-2 bg-sky-200 dark:bg-sky-800 w-full">
    {#if selectedComment}
      답글
    {/if}
    작성
  </button>
{/if}


<style lang="scss">
  .__ios-bottom-fix {
    padding-bottom: 0;
    //noinspection CssOverwrittenProperties
    @supports (-webkit-touch-callout: none) {
      // noinspection CssInvalidFunction
      padding-bottom: constant(safe-area-inset-bottom);
      padding-bottom: env(safe-area-inset-bottom);
    }
  }

  #__textarea-general {
    display: block;
    @supports (-webkit-touch-callout: none) {
      display: none;
    }
  }

  #__textarea-mobile {
    display: none;
    @supports (-webkit-touch-callout: none) {
      display: block;
    }
  }

  #__goto-comment {
    @supports (-webkit-touch-callout: none) {
      display: none;
    }
  }
</style>
