<script lang="ts">
  import Login from 'svelte-material-icons/Login.svelte';
  import Menu from 'svelte-material-icons/Menu.svelte';
  import Switch from 'svelte-material-icons/ThemeLightDark.svelte';
  import Console from 'svelte-material-icons/Tools.svelte';
  import Search from 'svelte-material-icons/Magnify.svelte';
  import Cookies from 'js-cookie';
  import {dayjs} from 'dayjs';
  import {fly, fade} from 'svelte/transition';
  import {session, page} from '$app/stores';
  import {EUserRanks} from '$lib/types/user-ranks';
  import {goto} from '$app/navigation';
  import {darkColor, iosStatusBar, iosStatusBarColor, theme} from '$lib/stores/shared/theme';
  import {tick} from 'svelte';

  export let boards: string[] = [];
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
      goto(`/community/search?q=${encodeURIComponent(searchText)}`)
        .then(async () => {
          searchMode = true;
          await tick();
          searchInput.focus();
        });
    }

  }

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
    const isDarkMode = html.classList.value.includes('dark');
    if (isDarkMode) {
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
    iosStatusBarColor.set(isDarkMode ? '#FFFFFF' : darkColor);
  }

  function checkBoardLink(event: MouseEvent, link: string) {
    // console.log(link, $page.url.pathname);
    // todo: prevent going scroll top on same page if you clicked nav menu
  }

</script>

{#if showSideMenu}
  <div transition:fly={{x: -(document.body.scrollWidth + 50), duration: 350}}
       class="absolute w-screen h-screen flex">
    <div class="bg-white dark:bg-gray-700 dark:text-zinc-200 w-9/12 h-screen shadow-black
                shadow-md z-50">
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
                      transition-colors dark:hover:bg-gray-500" sveltekit:prefetch
                 href="/community/{board.id}" on:click={closeSideMenu}>{board.name}</a>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  </div>
{/if}

{#if showSideMenu}
  <div transition:fade class="absolute w-screen h-screen bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm" on:click={closeSideMenu}></div>
{/if}

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
    <div class="overflow-hidden">
      <a class="hidden md:inline-block bg-sky-400 hover:bg-sky-500 dark:bg-transparent dark:hover:bg-gray-500 w-[52px] h-full relative transition-colors text-gray-700 transition-colors" href="/">
        <svg class="absolute h-full top-0 right-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 106.74 117.45"><defs><style>.cls-1{fill:#fff;}.cls-2{fill:#d97a74;}</style></defs><g id="레이어_2" data-name="레이어 2"><g id="레이어_1-2" data-name="레이어 1"><path class="cls-1" d="M61.12,0C55.47.68,43,11.5,43,11.5h7.59c.44,3.2,3,6.2,6.2,6.62S62.69,16,63,15.73a7.09,7.09,0,0,0,1.94-4.23h.59S66.76-.63,61.12,0Z"/><path class="cls-1" d="M26.94,12S11.16,4.79,5.83,6.84,7.4,23.08,7.4,23.08l1-.56c.88,1.95,2,3.44,3.77,4,3.89,1.17,9.7-2.71,10.06-7.58a6.66,6.66,0,0,0-.89-3.77Z"/><path class="cls-1" d="M0,117.38H20.46l15-46.16h9.94v46.23h20l.1-2.94V71.22h21v46.23h20.17V9.82H86.57V56h-21V9.82H32.19q-14.41,0-21.82,7.66T3.06,39.61Q3.06,49.5,6.38,56A23.83,23.83,0,0,0,16.89,66.62ZM23.32,40.45q0-7.94,2.93-11.56c1.75-2.22,4.45-3.34,8.08-3.34H45.45V56h-11a9.61,9.61,0,0,1-8.19-3.76Q23.33,48.38,23.32,40.45Zm12.76-6H55.54v3.18H36.26C30,37.59,29.72,34.41,36.08,34.41Zm0,8.82H55.54v3.19H36.26C30,46.42,29.72,43.23,36.08,43.23Z"/><path class="cls-2" d="M10.37,17.48a22.47,22.47,0,0,1,7.27-5c-2.64-.93-5.87-1.8-7.44-1.19-1.86.71-1,4.13-.12,6.49Z"/><path class="cls-2" d="M60.46,9.82c0-1.92-.45-4.6-2.44-4.37s-5.3,2.62-7.55,4.37Z"/></g></g></svg>
      </a>
      <ul class="__flat-menu space-x-1 items-center hidden md:inline-block
             lg:inline-block overflow-x-scroll overflow-y-hidden">
        {#each boards as board}
          <li class="p-2">
            <a class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md
                  transition-colors dark:hover:bg-gray-500"
               on:click={(e) => checkBoardLink(e, `/community/${board.id}`)}
               href="/community/{board.id}" sveltekit:prefetch>
              {board.name}
            </a>
          </li>
        {/each}
      </ul>
    </div>
    <ul class="__flat-menu flex p-2 space-x-1 items-center whitespace-nowrap min-w-0 overflow-hidden">
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
                   dark:hover:bg-gray-500 leading-zero">
        <Switch size="20px" />
      </span>
      </li>

      {#if $session.user && $session.user.rank > EUserRanks.User}
        <li>
          <a class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md transition-colors
                  dark:hover:bg-gray-500"
             href="/community/admin">
            <Console size="20px"/>
          </a>
        </li>
      {/if}

      {#if $session.user}
        <li>
          <a sveltekit:prefetch aria-label="내 프로필" href="/user"
             class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md transition-colors mt-0.5
                  dark:hover:bg-gray-500 truncate max-w-[16rem] sm:max-w-[24rem] md:max-w-[32rem] lg:max-w-full">
            {$session.user.sub.split('/')[1] ?? '알 수 없음'}
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

    -ms-overflow-style: none;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
</style>