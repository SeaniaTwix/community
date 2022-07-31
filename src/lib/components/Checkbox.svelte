<script lang="ts">
  import Checked from 'svelte-material-icons/Check.svelte';
  import {createEventDispatcher} from 'svelte';
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

<div class="group cursor-pointer select-none" on:click={clicked}>
  <span class="{checked ? 'bg-sky-400 group-hover:bg-sky-500' : 'bg-zinc-200 group-hover:zinc-400'} shadow-md rounded-md px-1 pb-0.5 cursor-pointer transition-all text-white">
    <span class="{checked ? 'visible' : 'invisible'}">
      <Checked />
    </span>
  </span>
  <slot/>
</div>