<script lang="ts">
  import Checked from 'svelte-material-icons/Check.svelte';
  import {createEventDispatcher} from 'svelte';
  import {fade} from 'svelte/transition';

  export let checked = false;
  const dispatch = createEventDispatcher();

  function changed() {
    // console.log('changed', checked);
    dispatch('change', checked);
  }

  function clicked() {
    checked = !checked;
    changed();
  }

</script>

<button class="group flex gap-1 justify-center" on:click={clicked}>
  <span class:bg-sky-400={checked}
        class:group-hover:bg-sky-500={checked}
        class:ring-sky-300={checked}
        class:group-hover:ring-sky-400={checked}
        class:bg-zinc-200={!checked}
        class:group-hover:bg-zinc-300={!checked}
        class:ring-zinc-300={!checked}
        class:group-hover:ring-zinc-400={!checked}
        class="leading-zero grow-0 inline-block text-white rounded-md ring-1 transition-colors">
    <span class="grow inline-flex flex-col justify-center text-center w-6 h-6 box-content">
      <span class="inline-block w-6 h-6 text-center pt-1">
        {#if checked}<span transition:fade={{duration:150}}><Checked /></span>{/if}
      </span>
    </span>
  </span>
  <span class="leading-normal select-none"><slot /></span>
</button>