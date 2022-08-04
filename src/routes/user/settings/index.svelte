<script lang="ts" context="module">

  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import HttpStatus from 'http-status-codes';

  export async function load({session: {user, ui}}: LoadEvent): Promise<LoadOutput> {
    if (!user) {
      return {
        redirect: '/',
      };
    }

    return {
      status: HttpStatus.OK,
      props: {
        leftAlign: ui.buttonAlign === 'left',
      }
    }
  }
</script>
<script lang="ts">
  import Checkbox from '$lib/components/Checkbox.svelte';
  import Cookies from 'js-cookie';
  import {session} from '$app/stores';

  export let leftAlign: boolean;

  function changeSettingLeftButtons(event: CustomEvent<boolean>) {
    const isSetAlignLeft = event.detail;
    Cookies.set('button_align', isSetAlignLeft ? 'left' : 'right');

    session.update((s) => {
      s.ui.buttonAlign = isSetAlignLeft ? 'left' : 'right';
      return s;
    })
  }

</script>
<div class="w-4/6 sm:w-2/3 md:w-1/2 lg:w-1/3 mx-auto space-y-4">
  <p>
    <Checkbox bind:checked={leftAlign} on:change={changeSettingLeftButtons}>글쓰기 버튼 좌측으로</Checkbox>
  </p>
</div>