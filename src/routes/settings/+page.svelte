<script lang="ts">
  import {page} from '$app/stores';
</script>
<div class="w-10/12 md:w-3/5 lg:w-1/3 mx-auto space-y-4 py-4">
  <ul>
    <li>
      <a href="{$page.url.pathname}/images"
        class="w-full block bg-zinc-100 rounded-md hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 text-center shadow-md">
        이미지 확장자 선택
      </a>
    </li>
  </ul>
</div>