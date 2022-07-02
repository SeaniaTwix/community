<script lang="ts">
  import Register from '$lib/components/Register.svelte';
  import {User} from '$lib/auth/user/client';
  import {goto} from '$app/navigation';

  function register(event: CustomEvent<{ id: string, pw: string }>) {
    const user = new User(event.detail.id);
    user.register(event.detail.pw, '')
      .then((token) => {
        localStorage.setItem('now.gd:token', token);
        goto(localStorage.getItem('now.gd:back') ?? '/').then(() => {
          localStorage.removeItem('now.gd:back');
        });
      });

    // 토큰을 저장하지만 실제로는 헤더의 쿠키 값으로 식별합니다.
    // 클라이언트에 저장하는 이유는 빠른 반응을 위함입니다. (유저 이름 등)
  }

</script>

<svelte:head>
  <title>계정 등록</title>
</svelte:head>

<div class="w-10/12 md:w-3/5 lg:w-1/3 mx-auto">
  <Register on:register={register}/>
</div>