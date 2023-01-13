<!--suppress JSUnusedAssignment -->
<script lang="ts">
  import Login from 'svelte-material-icons/Login.svelte';
  import Menu from 'svelte-material-icons/Menu.svelte';
  import Switch from 'svelte-material-icons/ThemeLightDark.svelte';
  import Console from 'svelte-material-icons/Tools.svelte';
  import Search from 'svelte-material-icons/Magnify.svelte';
  import Backspace from 'svelte-material-icons/Backspace.svelte';
  import Cookies from 'js-cookie';
  import {fly, fade} from 'svelte/transition';
  import {page} from '$app/stores';
  import {EUserRanks} from '$lib/types/user-ranks';
  import {goto} from '$app/navigation';
  import {darkColor, iosStatusBar, iosStatusBarColor, theme} from '$lib/stores/shared/theme';
  import {tick} from 'svelte';
  import Logo from '$lib/components/Logo.svelte';

  import type {PageData} from '$lib/types/$types';
  import {client} from '$lib/auth/user/client';
  import User from '$lib/components/nav-elements/UserName.svelte';
  export let data: PageData;

  export let boards = data.boards;
  let searchInput: HTMLInputElement;

  let showSideMenu = false;
  let searchMode = false;
  let searchText = '';

  async function enableSearchMode() {
    searchMode = true;
    await tick();
    searchInput.focus();
  }

  function exitSearchMode(event?: FocusEvent) {
    if (event?.relatedTarget && event.relatedTarget instanceof HTMLButtonElement && event.relatedTarget.hasAttribute('clear-search-text')) {
      return event.preventDefault();
    }
    searchMode = false;
  }

  function handleSearchInput(event: KeyboardEvent) {
    // noinspection JSDeprecatedSymbols
    if (event.isComposing || event.keyCode === 229) {
      return;
    }
    if (event.key === 'Enter') {
      //todo: search
      $page.url.searchParams.set('q', searchText);
      // console.log();
      goto($page.url.toString(), {invalidateAll: true})
        .then(async () => {
          searchMode = true;
          await tick();

          setTimeout(() => {
            const input = document.getElementById('__search-input');
            if (input) {
              input.focus();
            }
          }, 100);
        });
    }

    if (event.code === 'Escape' && searchMode) {
      exitSearchMode();
    }

  }

  $: showSearch = $page.url.pathname.startsWith('/community/') === true;

  function gotoLogin(event: Event) {
    event.preventDefault();
    if (location.pathname !== '/login') {
      sessionStorage.setItem('ru.hn:back', location.pathname);
    }
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
    const isDarkMode = html.classList.value.includes('dark');
    if (isDarkMode) {
      html.classList.remove('dark');
      Cookies.set('theme', 'light', {
        expires: 3650,
      });
      theme.set({mode: 'light'});
      iosStatusBar.set({mode: 'light'});
    } else {
      html.classList.add('dark');
      Cookies.set('theme', 'dark', {
        expires: 3650,
      });
      theme.set({mode: 'dark'});
      iosStatusBar.set({mode: 'dark'});
    }
    iosStatusBarColor.set(isDarkMode ? '#FFFFFF' : darkColor);
  }

  function checkBoardLink(event: MouseEvent, link: string) {
    goto(link, {noScroll: link === $page.url.pathname});
  }

  function detectFindKey(event: KeyboardEvent) {
    if (event.target instanceof HTMLElement) {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }
    }

    if (event.code === 'KeyF') {
      event.preventDefault();
      enableSearchMode();
    }
  }

  function clearSearchText() {
    searchText = '';
    searchMode = true;
    searchInput.focus();
  }

</script>

<svelte:body on:keydown={detectFindKey} />

<div class="fixed bg-white/50 backdrop-blur-lg z-50">
  {#if showSideMenu}
    <div transition:fly={{x: -(document.body.scrollWidth + 50), duration: 350}}
         class="absolute w-screen h-screen flex">
      <div class="bg-white dark:bg-gray-700 dark:text-zinc-200 w-9/12 h-screen shadow-gray-400
                shadow-lg z-50">
        <div class="p-2 block w-full shadow-md text-xl ">
          <span class="px-4 py-2">루헨</span>
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
                      transition-colors dark:hover:bg-gray-500" data-sveltekit-prefetch
                   href="/community/{board._key}" on:click={closeSideMenu}>{board.name}</a>
              </li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  {/if}
  {#if showSideMenu}
    <button transition:fade
         class="absolute w-screen h-screen bg-white/50 dark:bg-gray-600/50 backdrop-blur-sm touch-none overscroll-none cursor-default"
         on:click={closeSideMenu}></button>
  {/if}
</div>

<nav class="sticky top-0 bg-white/75 backdrop-blur-sm block shadow-md text-xl flex justify-between leading-none h-[3.375rem]
            dark:bg-gray-700/75 dark:text-zinc-200 select-none z-30">
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
    <div class="overflow-hidden space-x-2">
      <Logo />
      <ul class="__flat-menu space-x-1 items-center hidden md:inline-block
             lg:inline-block overflow-x-scroll overflow-y-hidden">
        {#each boards as board}
          <li class="py-2">
            <a class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md
                  transition-colors dark:hover:bg-gray-500"
               on:click|preventDefault={(e) => checkBoardLink(e, `/community/${board._key}`)}
               href="/community/{board._key}" data-sveltekit-prefetch>
              {board.name}
            </a>
          </li>
        {/each}
      </ul>
    </div>
    <ul class="__flat-menu flex p-2 space-x-1 items-center whitespace-nowrap min-w-0 overflow-hidden">
      {#if showSearch}

        <li>
          <button on:click={enableSearchMode} aria-label="검색 모드 활성화"
                class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md cursor-pointer
                       dark:hover:bg-gray-500">
            <Search size="1.25rem" />
          </button>
        </li>
      {/if}

      <li>
        <button on:click={switchTheme} aria-label="라이트 - 다크 모드 스위치"
              class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md cursor-pointer
                     dark:hover:bg-gray-500 leading-zero">
          <Switch size="20px" />
        </button>
      </li>

      {#if $client?.user && $client.user.rank > EUserRanks.User}
        <li>
          <a role="button" aria-label="관리 페이지로"
             class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md transition-colors
                  dark:hover:bg-gray-500"
             href="/community/admin">
            <Console size="20px"/>
          </a>
        </li>
      {/if}

      {#if $client?.user || data?.user}
        <li>
          <User user="{$client?.user ?? data?.user}" />
        </li>
      {:else}
        <li>
          <a data-sveltekit-prefetch role="button" aria-label="로그인 버튼" on:click={gotoLogin}
             class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md transition-colors
                  dark:hover:bg-gray-500"
             href="/login">
            <Login size="20px" />
          </a>
        </li>
      {/if}
    </ul>
  {:else}
    <div class="w-full pl-4 dark:bg-gray-700 flex flex-row justify-center">
      <input bind:this={searchInput}
             bind:value={searchText}
             on:blur={exitSearchMode}
             on:keydown={handleSearchInput}
             role="searchbox"
             id="__search-input"
             class="grow focus:outline-none bg-transparent"
             type="text"
             placeholder="이곳에 검색어를 입력하세요" />
      <button on:click={clearSearchText} class="w-13 pr-4 hover:text-zinc-400" clear-search-text>
        <Backspace size="1.25rem" />
      </button>
    </div>
  {/if}
</nav>

<style lang="scss">
  :global {
    svg {
      display: inline;
    }
  }

  //noinspection CssInvalidFunction,CssOverwrittenProperties
  nav {
    padding-top: constant(safe-area-inset-top);
    padding-top: env(safe-area-inset-top);
  }

  ul.__flat-menu {
    li {
      display: inline-block;
    }

    -ms-overflow-style: none;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
</style>