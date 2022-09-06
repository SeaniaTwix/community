<script lang="ts">
  import {page} from '$app/stores';
</script>

<div class="w-1/2 mx-auto">
  <h1 class="text-3xl">Status: {$page.status}</h1>
  <p>
    {$page.error.message}
  </p>
</div>