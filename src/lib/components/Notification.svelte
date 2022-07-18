<script>
  import Check from 'svelte-material-icons/Check.svelte';
  import Goto from 'svelte-material-icons/ArrowRight.svelte';
  import {createEventDispatcher} from 'svelte';

  const dispath = createEventDispatcher();

  export let title = '';
  export let content = '';
</script>
<div class="rounded-md shadow-md bg-zinc-100 dark:bg-gray-500 overflow-hidden w-full">
  <div class="px-2 py-1">
    {title}
  </div>
  <div class="bg-zinc-50/50 dark:bg-gray-400/50 px-4 py-2 relative">
    <div>
      {content}
    </div>

    <div class="text-right">
        <span class="cursor-pointer text-sky-600 dark:text-sky-400 p-2 hover:text-sky-400 dark:hover:text-sky-300">
          <Check size="1rem" />
        </span>
      <span class="cursor-pointer text-sky-600 dark:text-sky-400 p-2 hover:text-sky-400 dark:hover:text-sky-300">
          <Goto size="1rem" />
        </span>
    </div>
  </div>
</div>