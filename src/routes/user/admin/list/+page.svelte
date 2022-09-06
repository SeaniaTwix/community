<script lang="ts">
  import Profile from 'svelte-material-icons/AccountDetails.svelte';
  import Ban from 'svelte-material-icons/Handcuffs.svelte'
  import PermBan from 'svelte-material-icons/Knife.svelte'
  import SetRole from 'svelte-material-icons/GamepadDown.svelte'
  import Promote from 'svelte-material-icons/Crown.svelte'
  import {EUserRanks} from '$lib/types/user-ranks';
  import CircleAvatar from '$lib/components/CircleAvatar.svelte';
  import {last} from 'lodash-es';

  import type {PageData} from './$types';
  import {client} from '$lib/auth/user/client';

  export let data: PageData

  function toImageSource(avatar: string) {
    if (!avatar) {
      avatar = 'https://s3.ru.hn/IMG_2775.GIF';
    }
    const type = last(avatar.split('.')).toLowerCase();
    return {src: avatar, type: `image/${type}`};
  }

  let users = data.users;
</script>

<svelte:head>
  <title>루헨 - 관리자용 사용자 목록</title>
</svelte:head>

<div class="w-10/12 md:w-3/5 lg:w-1/3 mx-auto space-y-4 pb-4">
  <ul class="space-y-4">
    {#each users as user}
      <li>
        <div class="px-4 py-2 bg-zinc-100 dark:bg-gray-500/50 rounded-md shadow-md flex flex-col space-y-2">
          <div class="flex-shrink-0 flex flex-row items-center justify-items-center space-x-2">
            <div class="w-14">
              <CircleAvatar fallback="{toImageSource(user.avatar)}" />
            </div>
            <div class="flex-grow flex flex-row items-center justify-items-center justify-between">
              <span>
                {user.id}
                    <span class="text-sm bg-sky-400 rounded-md text-white px-1 py-px">
                  {EUserRanks[user.rank]}
                </span>
                    {#if user.adult}
                  <span class="text-sm bg-rose-500 rounded-md text-white px-1 py-px">본인인증 완료: {#if user.adult.approved}성인{:else}미성년{/if}</span>
                {/if}
              </span>
            </div>

            <a class="hover:text-sky-400 cursor-pointer" href="/user/profile/{user._key}"><Profile /></a>
          </div>

          <div>
            {#if ($client?.user ?? data.user)?.rank > user.rank}
              <button class="hover:text-red-400 hover:bg-zinc-200 dark:hover:bg-zinc-500/50 rounded-md px-2 py-1 cursor-pointer">
                <Ban /> 정지
              </button>
              <button class="hover:text-red-600 hover:bg-zinc-200 dark:hover:bg-zinc-500/50 rounded-md px-2 py-1 cursor-pointer">
                <PermBan /> 영구정지
              </button>
              {#if ($client?.user ?? data.user)?.rank >= EUserRanks.Admin}
                <button class="hover:text-emerald-500 hover:bg-zinc-200 dark:hover:bg-zinc-500/50 rounded-md px-2 py-1 cursor-pointer">
                  <SetRole /> 역할 설정
                </button>
              {/if}
              {#if ($client?.user ?? data.user)?.rank >= EUserRanks.Admin}
                <button class="hover:text-amber-500 hover:bg-zinc-200 dark:hover:bg-zinc-500/50 rounded-md px-2 py-1 cursor-pointer">
                  <Promote /> 관리자로 지정
                </button>
              {/if}
            {/if}
          </div>
        </div>
      </li>
    {/each}
  </ul>
</div>