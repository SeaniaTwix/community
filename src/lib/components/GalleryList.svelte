<script lang="ts">

  import type {ArticleItemDto} from '$lib/types/dto/article-item.dto';
  import {isEmpty, isNumber, last} from 'lodash-es';
  import Tag from './Tag.svelte';
  import NoImage from 'svelte-material-icons/ImageOff.svelte'
  import Like from 'svelte-material-icons/ThumbUp.svelte';
  import Dislike from 'svelte-material-icons/ThumbDown.svelte';
  import View from 'svelte-material-icons/Eye.svelte';
  import Comment from 'svelte-material-icons/Comment.svelte';
  import Video from 'svelte-material-icons/Video.svelte';
  import CircleAvatar from './CircleAvatar.svelte';
  import {toSources} from '$lib/file/image/shared';
  import {page} from '$app/stores';
  import {client} from '$lib/auth/user/client';

  export let board: string;
  export let list: ArticleItemDto[] = [];
  export let showingUserContextMenuIndex = -1;
  $: isBestView = last($page.url.toString().split('?')[0].split('/')) === 'best';
  declare var query: string;
  $: query = !isEmpty($page.url.search) ? `${$page.url.search}${isBestView ? '&type=best' : ''}` : isBestView ? `?type=best` : '';

  function isToHide(gallery: ArticleItemDto) {
    const tags = Object.keys(gallery.tags);
    // noinspection TypeScriptUnresolvedFunction
    return tags.includes('성인') || tags.includes('후방');
  }
  
  function unwrapAutotag(title: string) {
    const e = /^[[(]?.+[\])]/gm.exec(title);
    return e ? title.replace(e[0], '') : title;
    // return title.replace(new RegExp('^[[(]' + title + '[\])]'), '')
  }

  function getAutotag(title: string) {
    const e = /^([[(]?.+[\])])/gm.exec(title);
    return e ? e[1] : '';
  }

  function toImageSource(avatar: string) {
    if (!avatar) {
      avatar = 'https://s3.ru.hn/IMG_2775.GIF';
    }
    const type = last(avatar.split('.')).toLowerCase();
    return {src: avatar, type: `image/${type}`};
  }

  const order = $client.settings?.imageOrder ?? ['jxl', 'avif', 'webp', 'png'];

  function sortSources(images: {srcset: string, type: string}[]) {
    return images.sort(({srcset: a}, {srcset: b}) => {
      const baseA: string = last(a.split('/'));
      const baseB: string = last(b.split('/'));
      const extA = last(baseA.split('.'));
      const extB = last(baseB.split('.'));
      return order.indexOf(extA) - order.indexOf(extB);
    });
  }

</script>

<div class="w-full box-content flex flex-row flex-wrap gap-4">
  {#each list as gallery}
      <div class="__gallery-box group box-content p-2 min-h-0 bg-zinc-50 hover:bg-zinc-100 dark:bg-gray-700/40 dark:hover:bg-gray-700/75 rounded-md shadow-md transition-all space-y-3">
        <a href="/community/{board}/{gallery._key}{query}">
          <div class:shadow-md={!isEmpty(gallery.images)} class="aspect-square select-none object-cover overflow-hidden rounded-md relative">
            <span class="text-sm absolute z-[1] top-1.5 right-1 bg-zinc-400/40 px-1.5 rounded-md text-zinc-100 backdrop-blur-md drop-shadow">
              <span>
                <Comment />
                {gallery.comments}
              </span>
              <span>
                <View />
                {gallery.views}
              </span>
            </span>
            {#if !isEmpty(gallery.images)}
              {#if isToHide(gallery)}
                <span class="absolute z-[1] bg-zinc-500/50 rounded-md px-1 py-px -translate-x-1/2 left-1/2 -translate-y-1/2 top-1/2 text-white w-fit text-sm">
                  {#if Object.keys(gallery.tags).includes('성인')}
                    성인용 콘텐츠
                  {:else}
                    후방 이미지
                  {/if}
                </span>
              {/if}
              {#if isEmpty(gallery.convertedImages)}
                <img class:blur-xl={isToHide(gallery)} class="w-full h-full object-cover bg-white group-hover:bg-zinc-200 dark:bg-gray-400/50 dark:group-hover:bg-gray-500/50 transition-colors" loading="lazy"
                     src="{gallery.images}" alt="main image of {gallery.title}" />
              {:else}
                <picture>
                  {#each sortSources(toSources(gallery.convertedImages)) as source}
                    <source srcset="{source.srcset}" type="{source.type}" />
                  {/each}
                  <img class:blur-xl={isToHide(gallery)} class="w-full h-full object-cover bg-white group-hover:bg-zinc-200 dark:bg-gray-400/50 dark:group-hover:bg-gray-500/50 transition-colors" loading="lazy"
                       src="{gallery.images}" alt="main image of {gallery.title}" />
                </picture>
              {/if}
            {:else}
              <span class="absolute rounded-md px-1 py-px -translate-x-1/2 left-1/2 -translate-y-1/2 top-1/2 text-zinc-600 dark:text-zinc-200 w-fit text-2xl">
                <NoImage />
              </span>
            {/if}
            </div>
          <div class="pt-2 hover:underline">
            <h2 class="text-lg font-bold px-1 after:ml-1 after:inline-block  after:bg-rose-500 after:text-white after:rounded-md after:px-1 after:text-xs items-center" class:__warning-adult-content={Object.keys(gallery.tags).includes('성인')}>
              {#if gallery.autoTag}
                <a class="font-bold text-sky-400" href="{$page.url.pathname}?q=%23{gallery.autoTag}">{getAutotag(gallery.title)}</a>
              {/if}
              <span>{typeof gallery.autoTag === 'string' ? unwrapAutotag(gallery.title) : gallery.title}</span>
              {#if gallery.video}
                <span>
                  <Video />
                </span>
              {/if}
            </h2>
          </div>
        </a>
        <button class="flex flex-row items-center space-x-1.5 hover:underline min-w-0">
          <span class="inline-block w-8 h-8">
            <CircleAvatar fallback="{toImageSource(gallery.author.avatar)}" />
          </span>
          <span class="truncate">
            {gallery.author.id}
          </span>

          {#if isNumber(gallery.tags._like)}
            <span>
              <Like /> {gallery.tags._like}
            </span>
          {/if}
          {#if isNumber(gallery.tags._dislike)}
            <span>
              <Dislike /> {gallery.tags._dislike}
            </span>
          {/if}
        </button>
        {#if !isEmpty(gallery.tags)}
          <div class="mt-1">
            <ol class="flex flex-row gap-1 flex-wrap">
              {#each Object.keys(gallery.tags).filter(tag => !tag.startsWith('_')) as tagName}
                <li class="inline-block">
                  <a href="{$page.url.pathname}?q=%23{decodeURIComponent(tagName)}">
                    <Tag count="{gallery.tags[tagName]}">{tagName}</Tag>
                  </a>
                </li>
              {/each}
            </ol>
          </div>
        {/if}
      </div>
  {/each}
</div>

<style lang="scss">

  .__warning-adult-content {
    &:after {
      content: "19";
    }
  }

  .__gallery-box {
    width: calc(50% - 1.5rem);

    @media (min-width: 768px) {
      width: calc((100% / 3) - 1.67rem);
    }

    @media (min-width: 1536px) {
      width: calc(20% - 1.8rem);
    }
  }
</style>