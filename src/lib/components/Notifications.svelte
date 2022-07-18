<script lang="ts">
  import {notifications} from '$lib/notifications/client';

  notifications.subscribe((notify) => {
    if (notify) {
      stored = [...stored, {...notify, createdAt: new Date}];
      setTimeout(() => {
        stored = stored.filter((noti) => noti._key !== notify._key);
      }, 10000);
    }
  });

  let stored = [];
</script>

<div class="absolute bg-red-400 h-0 sticky top-0 float-right z-[12]">
  <div class="mt-2 mr-2 space-y-2 flex flex-col">
  </div>
</div>