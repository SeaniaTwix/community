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
  import FullEditor from '$lib/components/FullEditor.svelte';
  import {writable} from 'svelte/store';

  const f = writable<File>(null);

  export let editorKey: string;
  export let board: string;
  export let name: string;
  export let usedTags: string[] = [];


  let fileUploader: HTMLInputElement;

  function fileSelected() {
    f.set(fileUploader.files[0]);
  }

</script>

<svelte:head>
  <title>게시판 - {name} - 새 글 쓰기</title>
</svelte:head>

<div class="hidden">
  <input type="file" bind:this={fileUploader} on:change={fileSelected}/>
</div>

<div class="mt-10 w-10/12 md:w-4/6 lg:w-3/5 mx-auto">
  <FullEditor {editorKey} {board} {usedTags} />
</div>
