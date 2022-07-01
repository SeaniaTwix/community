<script lang="ts">
  import Login from 'svelte-material-icons/Login.svelte';
  import Menu from 'svelte-material-icons/Menu.svelte';
  import Switch from 'svelte-material-icons/ThemeLightDark.svelte';
  import Console from 'svelte-material-icons/Tools.svelte';
  import Cookies from 'js-cookie';
  import addYears from 'date-fns/addYears';
  import {fly} from 'svelte/transition';
  import {isEmpty} from 'lodash-es';

  export let uid = '';
  export let boards: string[] = [];
  let showSideMenu = false;

  function switchSideMenu() {
    showSideMenu = !showSideMenu;
  }

  function closeSideMenu() {
    showSideMenu = false;
  }

  function switchTheme() {
    const html = document.getElementsByTagName('html')[0] as HTMLHtmlElement;
    if (html.classList.value.includes('dark')) {
      html.classList.remove('dark');
      Cookies.set('theme', 'light', {
        expires: addYears(new Date, 999),
      });
    } else {
      html.classList.add('dark');
      Cookies.set('theme', 'dark', {
        expires: addYears(new Date, 999),
      });
    }
  }
</script>

{#if showSideMenu}
  <div transition:fly={{x: -(document.body.scrollWidth + 50), duration: 400}}
       class="absolute w-screen h-screen flex">
    <div class="bg-white dark:bg-gray800 w-9/12 h-screen shadow-black shadow-md z-10">
      <div class="p-2 block w-full shadow-md text-xl ">
        <span class="px-4 py-2">NOW</span>
      </div>

      <div class="p-2 mt-1 text-lg">
        <ul class="space-y-3">
          <li>
            <a class="block px-4 py-2 w-full bg-zinc-100 hover:bg-zinc-200 rounded-md
                      transition-colors"
               href="/" on:click={closeSideMenu}>홈</a>
          </li>
          {#each boards as board}
            <li>
              <a class="block px-4 py-2 w-full bg-zinc-100 hover:bg-zinc-200 rounded-md
                      transition-colors" sveltekit:prefetch
                 href="/community/{board.id}" on:click={closeSideMenu}>{board.name}</a>
            </li>
          {/each}
        </ul>
      </div>
    </div>
    <div class="w-3/12" on:click={closeSideMenu}></div>
  </div>
{/if}

<nav class="block shadow-md text-xl flex justify-between leading-none mb-2 h-[3.375rem]">
  <ul class="p-2 inline-block md:hidden lg:hidden">
    <li>
      <button aria-label="사이드 메뉴 열기" on:click={switchSideMenu}
        class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md cursor-pointer">
        <Menu size="1.25rem" />
      </button>
    </li>
  </ul>
  <ul class="__flat-menu p-2 space-x-1 items-center hidden md:inline-block
             lg:inline-block overflow-x-scroll">
    <li>
      <a class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md"
         href="/">
        홈
      </a>
    </li>
    {#each boards as board}
      <li>
        <a class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md"
           href="/community/{board.id}" sveltekit:prefetch>
          {board.name}
        </a>
      </li>
    {/each}
  </ul>
  <ul class="__flat-menu p-2 space-x-1 items-center">
    <li>
      <span on:click={switchTheme} aria-label="라이트 - 다크 모드 스위치"
            class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md cursor-pointer">
        <Switch size="1.25rem" />
      </span>
    </li>

    <li>
      <a class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md" href="/">
        <Console size="20px" />
      </a>
    </li>

    {#if !isEmpty(uid)}
      <li>
        <span sveltekit:prefetch aria-label="내 프로필" href="/user"
           class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md">
          내 프로필
        </span>
      </li>
    {:else}
      <li>
        <a sveltekit:prefetch aria-label="로그인 버튼"
           class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md" href="/login">
          <Login size="20px" />
        </a>
      </li>
    {/if}
  </ul>
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