<script lang="ts">
  import Checkbox from '$lib/components/Checkbox.svelte';
  import Cookies from 'js-cookie';
  import dayjs from 'dayjs';
  import {client} from '$lib/auth/user/client';

  import type {PageData} from './$types';

  export let data: PageData;

  let leftAlign = data.leftAlign;

  function changeSettingLeftButtons(event: CustomEvent<boolean>) {
    const isSetAlignLeft = event.detail;

    Cookies.set('button_align', isSetAlignLeft ? 'left' : 'right', {
      expires: dayjs().add(1000, 'years').toDate(),
    });

    client.update((s) => {
      if (s.ui) {
        s.ui.buttonAlign = isSetAlignLeft ? 'left' : 'right';
      }
      return s;
    });
  }
</script>
<div class="w-4/6 sm:w-2/3 md:w-1/2 lg:w-1/3 mx-auto space-y-4">
  <p>
    <Checkbox bind:checked={leftAlign} on:change={changeSettingLeftButtons}>글쓰기 버튼 좌측으로</Checkbox>
  </p>
  <div>
    <a href="/settings/images"
       class="w-full block bg-zinc-100 rounded-md hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 text-center shadow-md">
      이미지 불러오기 순서 변경
    </a>
  </div>
</div>