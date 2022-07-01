<script lang="ts" context="module">

  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import type {BoardItemDto} from '$lib/types/dto/board-item.dto';
  import ky from 'ky-universal';

  export async function load({session, stuff, url, fetch}: LoadEvent): Promise<LoadOutput> {
    // console.log('__layout', url.origin)
    // const res = await fetch(`${url.pathname}/community/api/all`);
    // const {boards} = await res.json() as {boards: BoardItemDto[]};
    const response = await fetch(`${url.origin}/community/api/all`);
    const {boards} = await response.json<{boards: BoardItemDto[]}>();
    // const boards = [];
    // console.log(session, stuff, url.host)
    // console.log(session)
    return {
      status: 200,
      props: {
        uid: session?.uid,
        boards,
      }
    }
  }
</script>
<script lang="ts">
  import 'material-icons/iconfont/material-icons.css';
  import '../styles/tailwind.css';
  import Nav from '$lib/components/Nav.svelte';

  export let uid;
  export let boards: string[] = [];
  console.log(uid)
</script>

<Nav {boards} {uid}/>
<slot/>

<style lang="scss">
  // @import '~material-icons/iconfont/material-icons.scss';
</style>