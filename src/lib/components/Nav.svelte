<script>
  import Login from 'svelte-material-icons/Login.svelte';
</script>

<nav class="block shadow-md text-xl flex justify-between leading-none mb-2">
  <ul class="p-2 space-x-1 items-center">
    <li>
      <a class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md" href="/community">게시판</a>
    </li>
    <li>
      <a class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md" href="/community">게시판</a>
    </li>
  </ul>
  <ul class="p-2 space-x-1 items-center hidden md:inline-block lg:inline-block">
    <li>
      <a sveltekit:prefetch class="px-4 py-2 inline-block hover:bg-zinc-100 rounded-md" href="/login">
        <Login size="20px" />
      </a>
    </li>
  </ul>
</nav>

<style>
  li {
    display: inline-block;
  }
</style>