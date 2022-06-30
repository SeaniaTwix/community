<script lang="ts">
  import Register from '$lib/components/Register.svelte';
  import {User} from '$lib/auth/user/client';

  async function register(event: CustomEvent<{id: string, pw: string}>) {
    const user = new User(event.detail.id);
    const token = await user.register(event.detail.pw, '');
    localStorage.setItem('now.gd:token', token);
    // 토큰을 저장하지만 실제로는 헤더의 쿠키 값으로 식별합니다.
    // 클라이언트에 저장하는 이유는 빠른 반응을 위함입니다. (유저 이름 등)
  }

</script>

<div class="w-9/12 mx-auto">
  <Register on:register={register} />
</div>