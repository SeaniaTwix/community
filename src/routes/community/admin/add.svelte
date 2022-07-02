<script lang="ts">
  import {goto} from '$app/navigation';
  import ky from 'ky-universal';

  /**
   * 게시판 추가
   */
  let name = '';
  let isPub = true;
  let order: number | undefined = undefined;

  function requestNewBoard() {
    ky.post('/community/admin/api/add', {
      json: {
        name, pub: isPub, order,
      }
    })
      .then(async (response) => {
        const {id} = await response.json<{id: string}>();
        goto(`/community/${id}`).then();
      })
      .catch(() => {
        // todo: show error message
      })
  }

  function goBack() {
    goto('/community/admin');
  }
</script>

<svelte:head>
  <title>어드민 콘솔 - 게시판 추가</title>
</svelte:head>

<div class="w-3/12 rounded-md p-4 shadow-md mx-auto">
  <form on:submit|preventDefault class="space-y-4">
    <input class="w-full outline outline-sky-400 rounded-md p-2" bind:value={name}
           type="text" placeholder="게시판 이름">
    <div>
      <input id="enable-pub" class="inline" type="checkbox" bind:checked={isPub} />
      <span>공개 게시판입니다.</span>
    </div>
    <input class="w-full outline outline-sky-400 rounded-md p-2" bind:value={order}
           type="number" placeholder="게시판 순서 (공란시 최하위로)">

    <button on:click={requestNewBoard}
            class="w-full bg-sky-400 text-white items-center rounded-md px-4 py-2
                    flex-grow disabled:bg-sky-600 transition-colors">
      게시판 만들기
    </button>

    <button on:click={goBack}
            class="w-full bg-red-400 text-white items-center rounded-md px-4 py-2">
      취소
    </button>
  </form>
</div>