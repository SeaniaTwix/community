<script lang="ts" context="module">
  throw new Error("@migration task: Check code was safely removed (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292722)");

  // import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  // import {EUserRanks} from '$lib/types/user-ranks';

  // export async function load({session, }: LoadEvent): Promise<LoadOutput> {
  //   if (!session.user || session.user.rank <= EUserRanks.User) {
  //     return {
  //       status: 404,
  //       error: 'Page not found',
  //     }
  //   }
  //   return {
  //     status: 200,
  //   }
  // }
</script>

<slot/>