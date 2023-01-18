<script lang="ts">
  import type {PageData} from './$types';

  export let data: PageData;
</script>
<div class="w-4/6 sm:w-2/3 md:w-1/2 lg:w-1/3 mx-auto space-y-4">
  <div>
    <h2>이 게시판 관리자</h2>
    <div>
      {data.requires}
    </div>
  </div>
</div>