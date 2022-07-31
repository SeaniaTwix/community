<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import HttpStatus from 'http-status-codes';
  import type {IUser} from '$lib/types/user';

  export async function load({fetch, session, url}: LoadEvent): Promise<LoadOutput> {
    if (!session) {
      return {
        redirect: '/login'
      }
    }

    const requestTags = await fetch('/user/profile/edit/blocks/api/users');
    const {blocked} = await requestTags.json();

    const requestUserInfos = await fetch(`/user/profile/api/detail?ids=${blocked.map(b => b.key).join(',')}`);
    const {users: usersArray} = await requestUserInfos.json() as {users: IUser[]};

    const users = {};
    for (const user of usersArray) {
      users[user._key] = user;
    }

    // console.log(url.searchParams.get('id'))

    return {
      status: HttpStatus.OK,
      props: {
        blocked,
        users,
        userId: url.searchParams.get('id') ?? '',
      }
    }

  }
</script>
<script lang="ts">
  import {isEmpty} from 'lodash-es';
  import ky from 'ky-universal';
  import {EUserRanks} from '$lib/types/user-ranks';
  import CircleAvatar from '$lib/components/CircleAvatar.svelte';
  import {onMount} from 'svelte';
  import {goto} from '$app/navigation';
  import Delete from 'svelte-material-icons/Close.svelte';

  export let blocked: Array<{key: string, reason: string}>;
  export let users: Record<string, IUser>;

  export let userId = '';
  let reason = '';
  let uploading = false;
  let foundUser: IUser;

  async function add(target: string) {
    if (uploading || isEmpty(userId.trim())) {
      return;
    }

    uploading = true;

    const data = {
      user: target.trim(),
      reason,
    };

    try {
      await ky.post('/user/profile/edit/blocks/api/users', {
        json: data,
      });
      userId = '';

      if (!users[target.trim()]) {
        const {user} = await ky.get(`/user/profile/api/detail?id=${target.trim()}`).json<{user: IUser}>();
        users[user._key] = user;
      }
      // const result = await ky.get('/user/profile/edit/blocks/api/users').json();
      blocked = [...blocked, {key: target.trim(), reason}];
    } finally {
      uploading = false;
      foundUser = undefined;
      goto('/user/profile/edit/blocks/users')
    }
  }

  async function findUser() {
    const {user} = await ky.get(`/user/profile/api/detail?id=${userId.trim()}`).json<{user: IUser}>()
    foundUser = user;
  }

  function toImageSource(user: IUser) {
    // @ts-ignore
    const avatar = user.avatar;
    if (!avatar) {
      return undefined;
    }
    const type = avatar.split('.')[1];
    return {src: avatar, type,};
  }

  function detectEnter(event: KeyboardEvent) {
    if (event.isComposing || event.keyCode === 229) {
      return;
    }
    if (event.key === 'Enter') {
      findUser();
    }
  }

  async function remove(uid: string) {
    if (uploading) {
      return;
    }

    uploading = true;

    try {
      await ky.delete('/user/profile/edit/blocks/api/users', {
        json: {
          userIds: [uid.trim()],
        },
      });
      // const result = await ky.get('/user/profile/edit/blocks/api/users').json();
      blocked = blocked.filter((user) => user.key !== uid);
    } finally {
      uploading = false;
    }
  }

  onMount(() => {
    if (!isEmpty(userId)) {
      findUser();
    }
  });
</script>

<div class="w-4/6 sm:w-2/3 md:w-1/2 lg:w-1/3 mx-auto space-y-4">
  <div class="text-sm">
    <p>다음과 같은 유저는 정책상 차단할 수 없습니다.</p>
    <p><span class="text-sky-600">관리자 및 최고관리자 계정</span>, <span class="text-sky-600">저작권 관리 계정</span></p>
  </div>
  <div class="shadow-md rounded-md px-4 py-2 bg-zinc-50 dark:bg-gray-500">
    <input type="text" placeholder="계정별 유일 ID로만 차단 가능" on:keydown={detectEnter}
           bind:value={userId} autocorrect="off" autocapitalize="none"
           class="w-full bg-transparent outline-none focus:outline-0 rounded-md">
  </div>

  {#if foundUser}
    <div class="flex flex-row items-center space-x-2">
      <div class="w-16">
        <CircleAvatar fallback="{toImageSource(foundUser)}" />
      </div>
      <span>{foundUser.id}</span>
    </div>

    <div class="shadow-md rounded-md px-4 py-2 bg-zinc-50 dark:bg-gray-500">
      <input type="text" placeholder="사유" maxlength="48"
             bind:value={reason} autocorrect="off" autocapitalize="none"
             class="w-full bg-transparent outline-none focus:outline-0 rounded-md">
    </div>

    {#if foundUser.rank >= EUserRanks.Manager}
      관리자 계정은 차단할 수 없습니다.
    {:else}
      <button class="rounded-md shadow-md w-full py-2 bg-red-400 dark:bg-red-700 hover:bg-red-600 dark:hover:bg-red-600 transition-colors"
              on:click={() => add(foundUser._key)}>
        이 유저 차단하기
      </button>
    {/if}
  {/if}

  <div>
    {#if isEmpty(blocked)}
      <p class="text-center text-zinc-500 dark:text-zinc-300">등록된 유저 차단이 없습니다.</p>
    {:else}
      <ul>
        {#each blocked as user}
          <li>
            <div class="rounded-md bg-zinc-200 dark:bg-gray-500 px-4 py-2 flex flex-row justify-between">
              <div>
                <p>{users[user.key].id}</p>
                <i class="text-sm">사유: {user.reason}</i>
              </div>

              <span on:click={() => remove(user.key)} class="cursor-pointer -mt-0.5 hover:text-red-600">
                <Delete size="1rem"/>
              </span>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>