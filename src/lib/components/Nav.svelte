<script lang="ts">
  import Login from 'svelte-material-icons/Login.svelte';
  import Menu from 'svelte-material-icons/Menu.svelte';
  import Switch from 'svelte-material-icons/ThemeLightDark.svelte';
  import Console from 'svelte-material-icons/Tools.svelte';
  import Search from 'svelte-material-icons/Magnify.svelte';
  import Cookies from 'js-cookie';
  import {dayjs} from 'dayjs';
  import {fly} from 'svelte/transition';
  import {isEmpty} from 'lodash-es';
  import {getStores, page} from '$app/stores';
  import {EUserRanks} from '$lib/types/user-ranks';
  import {goto} from '$app/navigation';
  import {iosStatusBar, theme} from '$lib/stores/shared/theme';
  import type {IUser} from '$lib/types/user';
  import {tick} from 'svelte';

  export let uid = '';
  export let boards: string[] = [];
  export let user: IUser;
  let searchInput: HTMLInputElement;

  let showSideMenu = false;
  let searchMode = false;
  let searchText = '';

  async function enableSearchMode() {
    searchMode = true;
    await tick();
    searchInput.focus();
  }

  function exitSearchMode() {
    searchMode = false;
  }

  function detectEnter(event: KeyboardEvent) {

    if (event.isComposing || event.keyCode === 229) {
      return;
    }
    if (event.key === 'Enter') {
      //todo: search
      goto(`/community/search?q=${searchText}`)
        .then(async () => {
          searchMode = true;
          await tick();
          searchInput.focus();
        });
    }

  }

  const {session} = getStores();

  $: showSearch = $page.routeId?.startsWith('community/') === true;

  function gotoLogin(event: Event) {
    event.preventDefault();
    sessionStorage.setItem('ru.hn:back', location.pathname);
    goto('/login');
  }

  function switchSideMenu() {
    showSideMenu = !showSideMenu;
  }

  function closeSideMenu() {
    showSideMenu = false;
  }

  function switchTheme() {
    // console.log('switch')
    const html = document.getElementsByTagName('html')[0] as HTMLHtmlElement;
    if (html.classList.value.includes('dark')) {
      html.classList.remove('dark');
      Cookies.set('theme', 'light', {
        expires: dayjs().add(999, 'year').toDate(),
      });
      theme.set({mode: 'light'});
      iosStatusBar.set({mode: 'light'});
    } else {
      html.classList.add('dark');
      Cookies.set('theme', 'dark', {
        expires: dayjs().add(999, 'year').toDate(),
      });
      theme.set({mode: 'dark'});
      iosStatusBar.set({mode: 'dark'});
    }
  }

</script>

{#if showSideMenu}
  <div transition:fly={{x: -(document.body.scrollWidth + 50), duration: 400}}
       class="absolute w-screen h-screen flex">
    <div class="bg-white dark:bg-gray-700 dark:text-zinc-200 w-9/12 h-screen shadow-black
                shadow-md z-[15]">
      <div class="p-2 block w-full shadow-md text-xl ">
        <span class="px-4 py-2">루온</span>
      </div>

      <div class="p-2 mt-1 text-lg">
        <ul class="space-y-3">
          <li>
            <a class="block px-4 py-2 w-full bg-zinc-100 dark:bg-gray-500 hover:bg-zinc-200 rounded-md
                      transition-colors dark:hover:bg-gray-500"
               href="/" on:click={closeSideMenu}>홈</a>
          </li>
          {#each boards as board}
            <li>
              <a class="block px-4 py-2 w-full bg-zinc-100 dark:bg-gray-500 hover:bg-zinc-200 rounded-md
                      transition-colors dark:hover:bg-gray-500" sveltekit:prefetch
                 href="/community/{board.id}" on:click={closeSideMenu}>{board.name}</a>
            </li>
          {/each}
        </ul>
      </div>
    </div>
    <div class="w-3/12" on:click={closeSideMenu}></div>
  </div>
{/if}

<nav class="block shadow-md text-xl flex justify-between leading-none h-[3.375rem]
            dark:bg-gray-700 dark:text-zinc-200 select-none z-40">
  {#if !searchMode}
    <ul class="p-2 inline-block md:hidden lg:hidden">
      <li>
        <button aria-label="사이드 메뉴 열기" on:click={switchSideMenu}
                class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md cursor-pointer
               dark:hover:bg-gray-500">
          <Menu size="1.25rem" />
        </button>
      </li>
    </ul>
    <ul class="__flat-menu p-2 space-x-1 items-center hidden md:inline-block
             lg:inline-block overflow-x-scroll">
      <li>
        <a class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md dark:hover:bg-gray-500
                transition-colors"
           href="/">
          홈
        </a>
      </li>
      {#each boards as board}
        <li>
          <a class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md
                  transition-colors dark:hover:bg-gray-500"
             href="/community/{board.id}" sveltekit:prefetch>
            {board.name}
          </a>
        </li>
      {/each}
    </ul>
    <ul class="__flat-menu p-2 space-x-1 items-center">
      {#if showSearch}

        <li>
          <span on:click={enableSearchMode} aria-label="검색 모드 활성화"
                class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md cursor-pointer
                       dark:hover:bg-gray-500">
            <Search size="1.25rem" />
          </span>
        </li>
      {/if}

      <li>
      <span on:click={switchTheme} aria-label="라이트 - 다크 모드 스위치"
            class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md cursor-pointer
                   dark:hover:bg-gray-500">
        <Switch size="1.25rem" />
      </span>
      </li>

      {#if $session && $session.rank > EUserRanks.User}
        <li>
          <a class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md transition-colors
                  dark:hover:bg-gray-500"
             href="/community/admin">
            <Console size="20px"/>
          </a>
        </li>
      {/if}

      {#if !isEmpty(uid)}
        <li>
          <a sveltekit:prefetch aria-label="내 프로필" href="/user"
             class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md transition-colors
                  dark:hover:bg-gray-500">
            {user?.id ?? '알 수 없음'}
          </a>
        </li>
      {:else}
        <li>
          <a sveltekit:prefetch aria-label="로그인 버튼" on:click={gotoLogin}
             class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md transition-colors
                  dark:hover:bg-gray-500"
             href="/login">
            <Login size="20px" />
          </a>
        </li>
      {/if}
    </ul>
  {:else}
    <input bind:this={searchInput}
           bind:value={searchText}
           on:blur={exitSearchMode}
           on:keydown={detectEnter}
           class="w-full px-4 focus:outline-none dark:bg-gray-700"
           type="text"
           placeholder="이곳에 검색어를 입력하세요" />
  {/if}
</nav>

<style lang="scss">
  :global {
    svg {
      display: inline;
    }
  }
  ul.__flat-menu {
    li {
      display: inline-block;
    }
  }
</style>