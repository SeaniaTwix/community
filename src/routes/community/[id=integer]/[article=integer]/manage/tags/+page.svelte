<script lang="ts" context="module">
  throw new Error("@migration task: Check code was safely removed (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292722)");

  // import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  // import HttpStatus from 'http-status-codes';
  // import {EUserRanks} from '$lib/types/user-ranks';

  // export async function load({params: {id, article}, fetch, session: {user}}: LoadEvent): Promise<LoadOutput> {
  //   if (!user || user.rank <= EUserRanks.User) {
  //     return {
  //       status: HttpStatus.NOT_ACCEPTABLE,
  //       error: '권한이 없습니다',
  //     };
  //   }
  //   const r = await fetch(`/community/${id}/${article}/manage/api/tags`);
  //   const {tags, author} = await r.json();
  //   return {
  //     status: HttpStatus.OK,
  //     props: {
  //       tags,
  //       author,
  //     },
  //   };
  // }
</script>
<script lang="ts">
  throw new Error("@migration task: Add data prop (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292707)");

  import type {ITag} from '$lib/types/tag';
  import {isEmpty} from 'lodash-es';
  import {page} from '$app/stores';
  import Back from 'svelte-material-icons/ArrowLeftBold.svelte'
  import {IUser} from '$lib/types/user';

  export let tags: (ITag & {user: IUser})[] = [];
  export let author: string;
  let exceptReserved = tags
    .filter(tag => !tag.name.startsWith('_'))
    .sort((a, b) => {
      if (a.user._key === author) {
        return -1;
      }

      return (new Date(a.createdAt)).getTime() - (new Date(b.createdAt)).getTime();
    });
  let likedOnly = tags.filter(tag => tag.name === '_like');
  let dislikedOnly = tags.filter(tag => tag.name === '_dislike');
</script>

<div class="w-4/6 sm:w-2/3 md:w-1/2 lg:w-1/3 mx-auto space-y-4">
  <div class="flex justify-end">
    <a href="/community/{$page.params.id}/{$page.params.article}/manage" class="px-4 py-2 rounded-md hover:bg-zinc-200 dark:hover:bg-gray-400 transition-colors">
      <Back />
    </a>
  </div>
  {#if !isEmpty(likedOnly)}
    <h2>추천 한 사람</h2>
    <ul>
      {#each likedOnly as like}
        <li>
          <div class="bg-zinc-100 dark:bg-gray-500 px-4 py-2 rounded-md shadow-md">
            <span>추천한 사람: {like.user.id}({like.user._key})</span>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  {#if !isEmpty(dislikedOnly)}
    <h2>비추천 한 사람</h2>
    <ul>
      {#each dislikedOnly as dislike}
        <li>
          <div class="bg-zinc-100 dark:bg-gray-500 px-4 py-2 rounded-md shadow-md">
            <span>비추천한 사람: {dislike.user.id}({dislike.user._key})</span>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <h2>태그 목록</h2>
  {#if !isEmpty(exceptReserved)}
    <ul class="space-y-2">
      {#each exceptReserved as tag}
        <li>
          <div class="bg-zinc-100 dark:bg-gray-500 px-4 py-2 rounded-md shadow-md">
            <h2>태그: {tag.name}</h2>
            <p>
              작성자: {tag.user.id}({tag.user._key})
              {#if tag.user._key === author}
                <span class="px-1.5 py-0.5 text-sm bg-sky-400 rounded-md">게시글 작성자</span>
              {/if}
            </p>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="text-center">태그 목록이 비었습니다.</p>
  {/if}
</div>