<script lang="ts">
  import Cookies from 'js-cookie';
  import dayjs from 'dayjs';
  import {flip} from 'svelte/animate';
  import {dndzone} from 'svelte-dnd-action';
  import type {AllowedExtensions} from '@root/app';
  import {client} from '$lib/auth/user/client';
  import io from '$lib/image-order';

  let imageOrder: {id: number, name: AllowedExtensions}[] = io()
    .map((name, id) => ({id, name}));

  function handleDndConsider(event: CustomEvent<{items: typeof imageOrder}>) {
    imageOrder = event.detail.items;
  }

  function handleDndFinalize(event: CustomEvent<{items: typeof imageOrder}>) {
    // console.log(event.detail.items);
    imageOrder = event.detail.items;
    const orders = Object.values(imageOrder).map(i => i.name);
    const expires = dayjs().add(1000, 'year').toDate();

    Cookies.set('image_order', orders.join(','), {
      path: '/',
      expires,
    });

    client.update((s) => {
      if (s.settings) {
        s.settings.imageOrder = orders;
      }
      return s;
    });
  }

</script>

<div class="w-4/6 sm:w-2/3 md:w-1/2 lg:w-1/3 mx-auto space-y-4 py-4">
  <div class="space-y-2">
    <h2>변환된 이미지 불러오기 순서</h2>
    <div>
      <p class="text-zinc-400 text-sm">위로 올수록 우선순위를 갖게 되며, 브라우저가 지원하는 이미지만 불러오게 됩니다.</p>
      <p class="text-zinc-400 text-sm">(드래그 앤 드롭으로 변경)</p>
    </div>
    <section use:dndzone={{items: imageOrder, flipDurationMs: 300}}
             on:consider={handleDndConsider}
             on:finalize={handleDndFinalize}
             class="rounded-md ring-1 ring-sky-400 flex flex-col divide-y p-2">
      {#each imageOrder as ext(ext.id)}
        <div animate:flip="{{duration: 300}}" class="p-2">
          <div class="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-gray-500 rounded-md transition-colors">
            .{ext.name}
          </div>
        </div>
      {/each}
    </section>
    <div>
      <p>모든 이미지가 움직이는 이미지(움짤)을 지원합니다. 파일 크기는 일반적으로 png가 가장 크고, 그 후로는 webp, jxl = avif 순입니다.</p>
      <p>단 jxl의 경우 아직 완성된 확장자가 아니므로 avif보다 무거울 때가 있고, webp의 경우 작은 이미지에서 매우 효율적인 압축률을 보여주므로 가장 작은 파일 크기가 될 수 있습니다.</p>
      <p>avif는 일반적으로 모든 상황에서 뛰어난 품질과 압축 효율을 보여주지만 jxl 보다 조금 더 나은 호환성을 가지고 있으므로 몇몇 브라우저에선 제대로 보이지 않거나 아예 사용할 수 없습니다.</p>
      <p>webp는 지원하는 브라우저도 비교적 많고 압축 효율도 좋지만 iOS 브라우저에서 움짤 프레임이 느린 문제점이 있습니다. 그 외에는 가장 무난합니다.</p>
      <p>png는 매우 무겁지만 (원본이 jpg인 경우 2.5배 까지도 용량이 커질 수 있음) 가장 호환성이 좋습니다. 움짤의 경우 apng로 인코딩 하므로 iOS에서 이상없이 움짤을 볼 수 있습니다.</p>
      <p>자세한 지원 사앙은 본인의 브라우저 이름과 버전을 숙지하시고 <a class="text-sky-400" href="https://caniuse.com/?search=image%20format">https://caniuse.com/?search=image format (EN)</a>을 읽어주세요.</p>
    </div>
  </div>
</div>