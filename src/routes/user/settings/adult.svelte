<script>
  import Checkbox from '$lib/components/Checkbox.svelte';

  let accepted = false;
</script>
<div class="w-10/12 md:w-3/5 lg:w-1/3 mx-auto space-y-4">
  <h2 class="text-xl">성인인증 정보처리 방침</h2>
  <div class="rounded-md w-full bg-zinc-100 dark:bg-gray-500/50 px-6 py-4 leading-loose">
    <p>성인인증을 하는 사용자는 다음과 같은 정보를 ru.hn의 서버에 이진 데이터 값으로 저장됨을 이해하며 동의해야 합니다.</p>
    <ul class="ml-4">
      <li class="list-disc">
        <p>성인 여부</p>
      </li>
      <li class="list-disc">
        <p>bbaton 계정 이름</p>
      </li>
    </ul>
    <p>또한 그 외 값은 ru.hn이 수집하지 않으며, 기술적으로 복제 할 수 있는 데이터의 종류는 비바톤에 별도로 문의하셔야 합니다.</p>
    <p>복제된 데이터의 사용 용도는 다음으로 제한합니다.</p>
    <ul class="ml-4">
      <li class="list-disc">
        <p>성인인증이 필요한 성인용 콘텐츠에 접근 허가 판별</p>
      </li>
      <li class="list-disc">
        <p>관리자용 계정에서의 사용자 계정의 성인인증 여부 확인</p>
      </li>
    </ul>
    <p>사용자 계정은 인증하는 본인만 사용 가능하며 계정의 양도나 공개, 판매 등은 원천적으로 불허합니다.</p>
    <p>위 내용에 모두 동의하지 않으시면 더 이상 진행할 수 없으며, 제공하는 방법 이외의 방법으로 성인인증에 성공하셔도 동의한 것으로 간주합니다.</p>
  </div>
  <div class="flex flex-row justify-center">
    <Checkbox bind:checked={accepted}>성인인증을 위한 정보처리 방침에 모두 동의합니다</Checkbox>
  </div>
  {#if accepted}
    <div>
      <a class="w-full block bg-zinc-100 rounded-md hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-4 text-center shadow-md flex flex-row justify-center space-x-2 items-center hover:ring-2 ring-red-400 ring-offset-2 dark:ring-offset-gray-600"
         href="https://bauth.bbaton.com/oauth/authorize?client_id=JDJhJDA0JDZucmUyZjFyLm5HMUVtNnJTL2VLMmU4RnNqbHhyQ1dseFNPS0hq&redirect_uri=https%3A%2F%2Fru.hn%2Fverify&response_type=code&scope=read_profile">
        <span class="inline-block w-4">
          <svg class="fill-[#0071bc] dark:fill-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.14 30.46">
            <path d="M0,30.46V0H9.15A17.22,17.22,0,0,1,13,.39a8.32,8.32,0,0,1,3,1.27A5.86,5.86,0,0,1,18,4.1a9.08,9.08,0,0,1,.7,3.78,8.36,8.36,0,0,1-.82,3.77,6,6,0,0,1-2.59,2.64v.09a11.31,11.31,0,0,1,2,1.42,5.69,5.69,0,0,1,1.16,1.48A5.83,5.83,0,0,1,19,19.13a16.53,16.53,0,0,1,.16,2.51q0,4.51-2.37,6.66c-1.57,1.44-3.85,2.16-6.82,2.16ZM7.06,12c.14,0,.35,0,.65,0a6.41,6.41,0,0,0,3.09-.69c.53-.38.8-1.34.8-2.89,0-1.27-.34-2.07-1-2.39a8.8,8.8,0,0,0-3.51-.49Zm0,13h.65c1,0,1.71-.06,2.16-.12a2.5,2.5,0,0,0,1.21-.45,2.09,2.09,0,0,0,.76-1.15A8,8,0,0,0,12.08,21a4.79,4.79,0,0,0-.32-1.92,2.32,2.32,0,0,0-.9-1.06,3.59,3.59,0,0,0-1.35-.45c-.51-.06-1.19-.11-2-.14h-.4Z"/>
          </svg>
        </span>
        <span>성인인증 하기</span>
      </a>
    </div>
  {:else}
    <a sveltekit:prefetch
       class="w-full block bg-zinc-100 rounded-md hover:bg-zinc-200 dark:bg-gray-500 transition-colors py-2 text-center shadow-md"
       href="/user">
      동의하지 않음
    </a>
  {/if}
</div>