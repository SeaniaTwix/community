<script lang="ts" context="module">

  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';

  export async function load({session, stuff, url}: LoadEvent): Promise<LoadOutput> {
    console.log(session, stuff, url.host)
    console.log(session)
    return {
      status: 200,
      props: {
        uid: session?.uid
      }
    }
  }
</script>
<script lang="ts">
  import 'material-icons/iconfont/material-icons.css';
  import '../styles/tailwind.css';
  import Nav from '$lib/components/Nav.svelte';

  export let uid;
  console.log(uid)
</script>

<Nav {uid}/>
<slot/>

<style lang="scss">
  // @import '~material-icons/iconfont/material-icons.scss';
</style>