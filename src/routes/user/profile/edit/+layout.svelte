<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import {EUserRanks} from '$lib/types/user-ranks';

  export async function load({session, }: LoadEvent): Promise<LoadOutput> {
    if (!session.user) {
      return {
        status: 404,
        error: 'Page not found',
      }
    }
    return {
      status: 200,
    }
  }
</script>

<slot/>