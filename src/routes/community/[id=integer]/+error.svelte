<script lang="ts" context="module">
  throw new Error("@migration task: Replace error load function (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3293209)");

  // /** @type {import('@sveltejs/kit').Load} */
  // export function load({ error, status }) {
  //   return {
  //     props: {
  //       title: `${status}: ${error.message}`
  //     }
  //   };
  // }
</script>
<script lang="ts">
  export let title: string;
</script>

<div class="w-1/2 mx-auto">
  <h1 class="text-3xl">{title}</h1>
</div>