<script lang="ts">
  import {page} from '$app/stores';

  function range(start, end): number[] {
    const n = end - start
    return Array.from([...Array(n + 1).keys()], i => i + start)
  }

  function getLink(pageNum: number) {
    const url = new URL($page.url);
    url.searchParams.set(pageKey, pageNum.toString());
    return url.toString();
  }

  export let base = '/';
  export let pageKey = 'page';
  export let min = 1;
  export let max = 3;
  export let current = 1;

  declare var pageRange: number[];
  $: pageRange = range(min, max);
</script>
<nav aria-label="Page navigation example" class="flex justify-center ">
  <ul class="inline-flex items-center -space-x-px">
    <li>
      {#if parseInt(current) !== min}
        <a href="{getLink(current - 1)}"
           class="block py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
          <span class="sr-only">Previous</span>
          <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"
               xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clip-rule="evenodd"></path>
          </svg>
        </a>
      {:else}
        <button disabled class="disabled:cursor-not-allowed block py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400">
          <span class="sr-only">Previous</span>
          <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"
               xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd"
                                                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                                        clip-rule="evenodd"></path></svg>
        </button>
      {/if}
    </li>
    {#each pageRange as i}
      <li>
        <a href="{getLink(i)}"
           aria-current="page"
           class="py-2 px-4 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 {parseInt(current) === i ? 'dark:bg-gray-600' : 'dark:bg-gray-800'} dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
          {i}
        </a>
      </li>
    {/each}
    <li>
      <a href="{getLink(current + 1)}"
         class="block py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
        <span class="sr-only">Next</span>
        <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"
             xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clip-rule="evenodd"></path>
        </svg>
      </a>
    </li>
  </ul>
</nav>