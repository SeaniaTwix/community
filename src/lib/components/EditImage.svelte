<script lang="ts">
  import {createEventDispatcher, onDestroy, onMount} from 'svelte';
  import { fade, fly } from 'svelte/transition';

  export let src: string;
  let cropper;
  let width, height;
  let act = false;
  let outputWidth;
  let outputHeight;

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }

  onMount(async () => {
    console.log('mounted')
  });

  async function toBase64(element: HTMLImageElement): Promise<string> {
    return await new Promise(resolve => {
      element.addEventListener('load', () => {
        const canvas = document.createElement('canvas') as HTMLCanvasElement;
        const context = canvas.getContext('2d');
        canvas.width = element.naturalWidth;
        canvas.height = element.naturalHeight;
        context.drawImage(element, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      });
    });
  }

  async function loadCropper(element: HTMLImageElement) {
    const isBlob = src.startsWith('blob:');
    if (!isBlob) {
      element.src = await toBase64(element);
    }
    const CropperClass = (await import('cropperjs')).default;
    cropper = new CropperClass(element);
    const canvas: HTMLElement = cropper.getCropperCanvas();
    width = element.naturalWidth;
    height = element.naturalHeight;
    canvas.style.width = `${width}px`;
    // canvas.style.height = `${height}px`;
    canvas.style.aspectRatio = `${width}/${height}`;
    canvas.style.maxWidth = '100%';
    canvas.style.margin = '0 auto';
    canvas.style.maxHeight = '100%';
    const selection = cropper.getCropperSelection();
    selection.addEventListener('change', (event: CustomEvent<Rect>) => {
      outputWidth = event.detail.width;
      outputHeight = event.detail.height;
    });
    selection.style.overscrollBehavior = 'contain';
    selection.$reset();
    console.log('load cropper done');
  }

  type Rect = {x: number, y: number, width: number, height: number};

  async function save() {
    const selection = cropper.getCropperSelection();
    const canvas: HTMLCanvasElement = await selection.$toCanvas({
      width: outputWidth,
      height: outputHeight,
    });
    const base64 = canvas.toDataURL();
    const bytes = atob(base64.split(',')[1]);
    const byteArrays: Uint8Array[] = [];

    for (let i = 0; i < bytes.length; i += 512) {
      const slice = bytes.slice(i, i + 512);
      const b = new Array<number>(slice.length);
      for (let n = 0; n < slice.length; n++) {
        b[n] = slice.charCodeAt(n);
      }
      const byteArray = Uint8Array.from(b);
      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, {type: 'image/png'});

    console.log(blob);

    dispatch('save', blob);
  }

</script>


<div in:fly="{{ y: 200, duration: 200 }}" out:fade
     class="fixed w-full h-full bg-white/60 dark:bg-gray-800/60 z-50 overscroll-contain">
  <div class=" mt-4 w-11/12 sm:w-5/6 md:w-4/5 lg:w-3/5 xl:w-1/2 2xl:2/5 mx-auto shadow-md rounded-md bg-white dark:bg-gray-600 p-4 min-h-full space-y-4 flex flex-col h-0">
    <div class="p-4 border-2 dark:border-gray-400 rounded-md max-h-[66%] flex flex-row justify-center" on:click={() => (act = true)} on:touchend={() => (act = true)}>
      <div class="max-w-full">
        <img class="h-full" use:loadCropper {src} alt="for edit" crossorigin="anonymous">
      </div>
    </div>
    <div class="w-2/3 mx-auto shrink-0 flex flex-col space-y-2">
      <div class="outline outline-sky-800 rounded-md px-4 flex justify-between">
        <label class="flex-grow inline-block">
          가로
          <input class="py-2 focus:outline-none" type="number" bind:value={outputWidth} />
        </label>
        <label class="flex-grow">
          세로
          <input class="py-2 focus:outline-none" type="number" bind:value={outputHeight} />
        </label>
      </div>
      {#if act}
        <button on:click={save} class="w-full bg-sky-400 dark:bg-sky-700 py-2 rounded-md shadow-md text-white">
          적용
        </button>
      {/if}
      <button on:click={close} class="w-full bg-red-400 dark:bg-red-700 py-2 rounded-md shadow-md text-white">
        닫기
      </button>
    </div>
  </div>
</div>

<style>
  #image {
    width: 100%;
    height: auto;
  }
</style>