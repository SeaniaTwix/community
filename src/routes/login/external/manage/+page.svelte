<script lang="ts">
  import type { PageData, FormData } from './$types';
  import {page} from '$app/stores';
  import Checkbox from '$lib/components/Checkbox.svelte';
  import { enhance } from '$app/forms';
  import Copy from 'svelte-material-icons/ContentCopy.svelte';;
  import Done from 'svelte-material-icons/Check.svelte';

  export let data: PageData;
  export let form: FormData;
  let isCopied = false;

  declare var nameInputType: 'hidden' | 'text';
  $:nameInputType = $page.url.searchParams.has('name') ? 'hidden' : 'text';

  let allowed = {
    login: false,
    userInfo: {
      id: false,
      profile: false,
    }
  }

  function selectAll(ev: MouseEvent) {
    if (ev.target instanceof HTMLInputElement) {
      ev.target.select();
    }
  }

  function copySecret() {
    const secretInput = document.querySelector('#secret-input') as HTMLInputElement;
    secretInput.select();
    document.execCommand('copy');
    isCopied = true;
    setTimeout(() => isCopied = false, 5000);
  }
</script>

<svelte:head>
  <title>루헨 - 외부 로그인 관리</title>
</svelte:head>

<div class="w-1/2 mx-auto my-4 px-8 py-4 bg-zinc-100 dark:bg-gray-500 rounded-md">
  {#if form?.secret}
    <p class="pb-2">해당 값을 분실할 경우 서버 관리자만 DB로 접근 가능합니다.</p>
    <div class="flex flex-row">
      <input id="secret-input" type="text" value="{form.secret}" on:click={selectAll}
             class="bg-transparent px-4 py-2 outline-none w-full placeholder-zinc-400 dark:placeholder-zinc-300">
      <button on:click={copySecret}
              class="px-4 py-2 bg-sky-400 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 rounded-md transition-colors">
        {#if isCopied}
          <Done />
        {:else}
          <Copy />
        {/if}
      </button>
    </div>
  {:else if data.mode === 'new'}
      {#if $page.url.searchParams.get('name')}
      <h1 class="text-xl">{$page.url.searchParams.get('name')} 어플리케이션 만들기</h1>
    {/if}
    <form method="POST" use:enhance class="flex flex-col gap-2">
      <div class:ring-2={form?.error === 'exists' || form?.error === 'no-name'}
           class="bg-zinc-200 dark:bg-gray-400 rounded overflow-hidden shadow-md ring-red-600">
        <input type="{nameInputType}"
               name="name" value="{$page.url.searchParams.get('name')}"
               placeholder="어플리케이션 이름"
               class="bg-transparent px-4 py-2 outline-none w-full placeholder-zinc-400 dark:placeholder-zinc-300">
      </div>
      <div class:ring-2={form?.error === 'no-callback'}
           class="bg-zinc-200 dark:bg-gray-400 rounded overflow-hidden shadow-md ring-red-600">
        <input type="text"
               name="callback"
               placeholder="어플리케이션 성공 콜백 URI"
               class="bg-transparent px-4 py-2 outline-none w-full placeholder-zinc-400 dark:placeholder-zinc-300">
      </div>
      <div class:ring-2={form?.error === 'no-callback'}
           class="bg-zinc-200 dark:bg-gray-400 rounded overflow-hidden shadow-md ring-red-600">
        <input type="text"
               name="fallback"
               placeholder="어플리케이션 실패 콜백 URI"
               class="bg-transparent px-4 py-2 outline-none w-full placeholder-zinc-400 dark:placeholder-zinc-300">
      </div>
      <div>
        <h2>허용</h2>
        <ul class="flex flex-col gap-1">
          <li>
            <Checkbox bind:checked={allowed.login}>서드파티 로그인</Checkbox>
          </li>
          <li>
            <Checkbox bind:checked={allowed.userInfo.id}>사용자 이름 읽기</Checkbox>
          </li>
          <li>
            <Checkbox bind:checked={allowed.userInfo.profile}>프로필 사진 읽기</Checkbox>
          </li>
        </ul>
      </div>

      <button class="px-4 py-2 rounded-md shadow-md bg-sky-400 dark:bg-sky-600 text-white">만들기</button>
    </form>
  {/if}

</div>