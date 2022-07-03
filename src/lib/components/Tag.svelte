<script lang="ts">
  export let count = 0;
</script>
<span class="rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-gray-700 dark:hover:bg-gray-400 px-2 py-1 flex justify-between space-x-1 select-none cursor-pointer">
  <span class="inline-block leading-5"><slot /></span>
  {#if count > 0}
    <span class="__circle text-xs bg-sky-400 text-white inline w-4 h-4 text-center mt-0.5">2</span>
  {/if}
</span>

<style>
  .__circle {
    border-radius: 50%;
  }
</style>