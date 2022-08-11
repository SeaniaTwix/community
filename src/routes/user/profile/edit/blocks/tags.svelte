<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import HttpStatus from 'http-status-codes';

  export async function load({fetch, session}: LoadEvent): Promise<LoadOutput> {
    if (!session) {
      return {
        status: HttpStatus.MOVED_TEMPORARILY,
        redirect: '/login',
      };
    }

    const requestTags = await fetch('/user/profile/edit/blocks/api/tags');
    const {blocked} = await requestTags.json();

    return {
      status: HttpStatus.OK,
      props: {
        blocked,
      },
    };

  }
</script>
<script lang="ts">
  import ky from 'ky-universal';
  import {isEmpty} from 'lodash-es';
  import Delete from 'svelte-material-icons/Close.svelte';

  export let blocked: string[];
  let tagName = '';
  let uploading = false;

  async function add() {
    if (uploading || isEmpty(tagName.trim())) {
      return;
    }

    uploading = true;

    try {
      await ky.post('/user/profile/edit/blocks/api/tags', {
        json: {
          tagNames: [tagName.trim()],
        },
      });

      tagName = '';

      const result = await ky.get('/user/profile/edit/blocks/api/tags').json();
      blocked = result.blocked;
    } finally {
      uploading = false;
    }
  }

  async function remove(tag: string) {
    if (uploading) {
      return;
    }

    uploading = true;

    try {
      await ky.delete('/user/profile/edit/blocks/api/tags', {
        json: {
          tagNames: [tag.trim()],
        },
      });
      const result = await ky.get('/user/profile/edit/blocks/api/tags').json();
      blocked = result.blocked;
    } finally {
      uploading = false;
    }
  }

  function detectEnter(event: KeyboardEvent) {
    if (event.isComposing || event.keyCode === 229) {
      return;
    }
    if (event.key === 'Enter') {
      add();
    }
  }
</script>

<div class="w-4/6 sm:w-2/3 md:w-1/2 lg:w-1/3 mx-auto space-y-4">
  <div class="text-sm">
    <p>태그 차단은 최대 24개 까지 지원합니다.</p>
    <p>또한 해당 태그의 동의어가 있다면 함께 차단됩니다.</p>
  </div>
  <div class="shadow-md rounded-md px-4 py-2 bg-zinc-50 dark:bg-gray-500">
    <input type="text" placeholder="엔터 키로 등록" on:keydown={detectEnter}
           bind:value={tagName} autocorrect="off" autocapitalize="none"
           class="w-full bg-transparent outline-none focus:outline-0 rounded-md">
  </div>
  <div>
    {#if isEmpty(blocked)}
      <p class="text-center text-zinc-500 dark:text-zinc-300">등록된 태그 차단이 없습니다.</p>
    {:else}
      <ul>
        {#each blocked as tag}
          <li>
            <div
              class="flex flex-row justify-between rounded-md bg-zinc-200 hover:bg-zinc-300 dark:bg-gray-500 px-4 py-2 transition-colors">
              <span>
                {tag}
              </span>
              <span on:click={() => remove(tag)} class="cursor-pointer -mt-0.5 hover:text-red-600">
                <Delete size="1rem"/>
              </span>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>