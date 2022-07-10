<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import type {IComment} from '$lib/types/comment';
  import type {IUser} from '$lib/types/user';
  import {uniq, isEmpty} from 'lodash-es';
  import {load as cheerio} from 'cheerio';
  import {ArticleDto} from '$lib/types/dto/article.dto';

  export async function load({params, fetch, session}: LoadEvent): Promise<LoadOutput> {
    const nr = await fetch(`/community/${params.id}/api/info`);
    const {name} = await nr.json();
    const res = await fetch(`/community/${params.id}/${params.article}/api/read`);
    const {article} = await res.json() as ArticleDto;
    const $ = cheerio(`<div class="__top">${article.content}</div>`);
    // @ts-ignore
    const elems = $('.__top:first > *').toArray();
    const contents = [];
    for (const elem of elems) {
      // console.log(elem);
      contents.push(cheerio(elem).html());
    }
    const ar = await fetch(`/user/profile/api/detail?id=${article.author}`);
    const {user} = await ar.json();
    const cr = await fetch(`/community/${params.id}/${params.article}/api/comment`);
    const {comments} = await cr.json() as { comments: IComment[] };
    // console.log('ids:', comments[0]);
    const userInfo = {};

    if (!isEmpty(comments)) {
      const commentAuthorIds = uniq(comments.map(c => c.author)).join(',');
      const car = await fetch(`/user/profile/api/detail?ids=${commentAuthorIds}`);
      if (car.ok) {
        const {users} = await car.json() as { users: IUser[] };
        // console.log(users);
        for (const user of users.filter(user => !!user)) {
          userInfo[user._key] = user;
        }
      }
    }

    return {
      status: 200,
      props: {
        article,
        contents,
        boardName: name,
        session,
        author: user,
        comments,
        users: userInfo,
      },
    };
  }
</script>
<script lang="ts">
  import TimeAgo from 'javascript-time-ago';
  import Upload from 'svelte-material-icons/Upload.svelte';
  import View from 'svelte-material-icons/Eye.svelte';
  import Plus from 'svelte-material-icons/Plus.svelte';
  import Favorite from 'svelte-material-icons/Star.svelte';
  import Edit from 'svelte-material-icons/Pencil.svelte';
  import Delete from 'svelte-material-icons/TrashCan.svelte';
  import Report from 'svelte-material-icons/AlertBox.svelte';
  import Up from 'svelte-material-icons/ArrowUp.svelte';
  import Down from 'svelte-material-icons/ArrowDown.svelte';
  import Back from 'svelte-material-icons/KeyboardBackspace.svelte';
  import Admin from 'svelte-material-icons/Settings.svelte';
  import Like from 'svelte-material-icons/ThumbUp.svelte';
  import LikeEmpty from 'svelte-material-icons/ThumbUpOutline.svelte';
  import Dislike from 'svelte-material-icons/ThumbDown.svelte';
  import DislikeEmpty from 'svelte-material-icons/ThumbDownOutline.svelte';
  import RemoveTag from 'svelte-material-icons/Close.svelte';
  import {ko} from '$lib/time-ko';
  import type {IArticle} from '$lib/types/article';
  import ky from 'ky-universal';
  import {onMount, onDestroy} from 'svelte';
  import {Pusher} from '$lib/pusher/client';
  import {fade} from 'svelte/transition';
  import CircleAvatar from '$lib/components/CircleAvatar.svelte';
  import {dayjs} from 'dayjs';
  import {EUserRanks} from '$lib/types/user-ranks';
  import Tag from '$lib/components/Tag.svelte';
  import Comment from '$lib/components/Comment.svelte';
  import type {Subscription} from 'rxjs';
  import {goto} from '$app/navigation';
  import {inRange} from 'lodash-es';
  import Content from '$lib/components/Content.svelte';

  /**
   * 게시글 보기
   */
  TimeAgo.addLocale(ko as any);
  const timeAgo = new TimeAgo('ko-KR');

  interface TagType {
    [tagName: string]: number;
  }

  export let article: IArticle<TagType> = undefined;
  export let contents: string[] = [];
  export let boardName: string;
  // eslint-disable-next-line no-undef
  export let session: App.Session;
  export let author: IUser;
  export let users: Record<string, IUser>;
  export let comments: IComment[];
  let liked = article.myTags?.find((tag) => tag.name === '_like') !== undefined;
  let disliked = article.myTags?.find((tag) => tag.name === '_dislike') !== undefined;
  let likeCount = article.tags?._like ?? 0;
  let dislikeCount = article.tags?._dislike ?? 0;

  /**
   * 대댓글 등의 댓글 id가 들어올 수 있습니다.
   * 여기에 id가 들어오면 대댓글 모드가 됩니다.
   */
  let relative: string | undefined;

  let commentContent = '';

  let commenting = false;

  async function addComment() {
    if (!session && !commenting) {
      return;
    }

    commenting = true;

    const commentData: IComment = {
      article: article._key,
      content: commentContent,
    };
    if (relative) {
      commentData.relative = relative;
    }

    // console.log(commentData);
    // return;
    const result = await ky.post(`/community/${article.board}/${article._key}/api/comment`, {
      json: commentData,
    }).json();

    // console.log(result);

    commentContent = '';

    commenting = false;
  }

  function detectSend(event: KeyboardEvent) {
    /*
    if (event.isComposing || event.keyCode === 229) {
      return;
    } // */
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      // console.log(event.ctrlKey, event.metaKey);
      event.preventDefault();
      addComment().then();
    }
  }

  function isMyTag(tagName: string): boolean {
    // console.log(tagName, article.myTags)
    return article.myTags?.find(tag => tag.name === tagName) !== undefined;
  }


  let prevVisualViewport = 0;
  const fixIosKeyboardScrolling = () => {
    const currentVisualViewport = window.visualViewport.height;

    const isKeyboardVisible = prevVisualViewport > currentVisualViewport;
    let changed = prevVisualViewport - currentVisualViewport;

    if (isKeyboardVisible) {
      if (inRange(changed, -50, 50)) {
        changed = prevVisualViewport - changed;
      }
      window.scrollTo(0, changed);
    } else {
      window.scrollTo(0, 0);
      prevVisualViewport = window.visualViewport.height;
    }
  };

  async function addTag(tags: string) {
    const t = tags.includes(',')
      ? tags.split(',').map(v => v.trim()).join(',') : tags.trim();
    return await ky
      .put(`/community/${article.board}/${article._key}/api/tag/add?name=${t}`)
      .json();
  }

  async function removeTag(tags: string) {
    const t = tags.includes(',')
      ? tags.split(',').map(v => v.trim()).join(',') : tags.trim();
    return await ky
      .delete(`/community/${article.board}/${article._key}/api/tag/remove?name=${t}`)
      .json();
  }

  async function vote(type: 'like' | 'dislike') {
    // console.log(type);
    if (type === 'like') {
      if (liked) {
        liked = false;
        return removeTag('_like');
      } else if (disliked) {
        disliked = false;
        await removeTag('_dislike');
      }
      if (session.uid !== article.author) {
        liked = true;
        return await addTag('_like');
      }
    } else { // vote dislike
      if (disliked) {
        disliked = false;
        return removeTag('_dislike');
      } else if (liked) {
        liked = false;
        await removeTag('_like');
      }
      if (session.uid !== article.author) {
        disliked = true;
        return await addTag('_dislike');
      }
    }
  }

  async function userNameExistingCheck(author: string) {
    if (!users[author]) {
      try {
        const {user} = await ky.get(`/user/profile/api/detail?id=${author}`)
          .json<{ user: IUser }>();

        users[user._key] = user;
      } catch {
        console.error('user detail unavaliable');
      }
    }
  }

  let subscriptions: Subscription[] = [];
  let pusher: Pusher;
  onMount(async () => {
    console.log(article);

    pusher = new Pusher(article._key);

    document.body.classList.add('overflow-hidden', 'touch-none');

    try {
      prevVisualViewport = window.visualViewport.height;

      window.visualViewport.addEventListener('resize', fixIosKeyboardScrolling, true);

      ky.put(`/community/${article.board}/${article._key}/api/viewcount`).then();


      const whileSub = async ({body}) => {
        if (typeof body.author === 'string') {
          await userNameExistingCheck(body.author);

          if (body.content) {
            const newComment: IComment = {
              ...body,
              createdAt: new Date,
            };
            comments = [...comments, newComment];
          }
        }
      };

      const whenTagChanged = async ({body}) => {
        // await userNameExistingCheck(body.author);
        const tags = body.tag as string[];
        const type = body.type as 'add' | 'remove';
        if (tags) {
          let amount = type === 'add' ? 1 : -1;
          for (const tag of tags) {
            // noinspection TypeScriptUnresolvedFunction
            if (Object.keys(article.tags).includes(tag)) {
              article.tags[tag] += amount;
            } else if (amount > 0) {
              article.tags[tag] = 1;
            }
          }
        }
      };

      const observable = pusher.observable('comments');
      subscriptions.push(observable.subscribe(whileSub));
      const tagChange = pusher.observable('tag');
      subscriptions.push(tagChange.subscribe(whenTagChanged));

      // window.document.body.addEventListener('scroll', preventScrolling, true);

    } catch (e) {
      console.error(e);
    }
  });

  onDestroy(() => {
    for (const sub of subscriptions) {
      sub.unsubscribe();
    }
    pusher?.close();
    try {

      window?.visualViewport.removeEventListener('resize', fixIosKeyboardScrolling, true);
      // window.document.body.removeEventListener('scroll', preventScrolling, true);

      document.body.classList.remove('overflow-hidden', 'touch-none');
    } catch {
      // no window. it's ok.
    }
  });

  function timeFullFormat(time: Date | number) {
    return dayjs(new Date(time)).format('YYYY년 M월 D일 HH시 m분');
  }
</script>

<svelte:head>
  <title>{boardName} - {article.title}</title>
</svelte:head>

<div class="touch-none hidden cursor-not-allowed"></div>

<div class="hidden absolute w-screen h-screen bg-gray-700/50 z-10 top-0">

</div>

<div in:fade
     class="flex flex-col justify-between __fixed-view">
  <div class="flex justify-between w-full w-11/12 sm:w-5/6 md:w-4/5 lg:w-3/5 mx-auto">
    <nav class="flex ml-4 grow-0 shrink" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <a href="/"
             class="inline-flex items-center text-sm font-medium text-gray-700 hover:text-sky-400 dark:text-gray-400 dark:hover:text-white w-max">
            <svg class="mr-2 w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
            </svg>
            홈
          </a>
        </li>
        <li>
          <div class="flex items-center">
            <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20"
                 xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"></path>
            </svg>
            <a href="/community/{article.board}"
               class="ml-1 text-sm font-medium text-gray-700 md:ml-2 dark:text-gray-400 dark:hover:text-white hover:text-sky-400 w-max">
              {boardName}
            </a>
          </div>
        </li>
        <li aria-current="page">
          <div class="flex items-center text-ellipsis overflow-hidden">
            <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20"
                 xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"></path>
            </svg>
            <span class="w-full ml-1 text-sm font-medium text-gray-500 md:ml-2
             dark:text-gray-400 text-ellipsis overflow-hidden">
              {article.title}
            </span>
          </div>
        </li>
      </ol>
    </nav>
  </div>

  <div class="p-4 space-y-4 overflow-y-scroll flex-grow">
    <div
      class="w-11/12 sm:w-5/6 md:w-4/5 lg:w-3/5 mx-auto p-4 rounded-md shadow-md transition-transform divide-y divide-dotted">
      <div class="space-y-2 mb-4">
        <div class="flex justify-between">
          <div class="flex space-x-2 flex-col md:flex-row lg:flex-row">
            <h2 class="text-2xl flex-shrink">{article.title}</h2>
            <div class="inline-block flex space-x-2">
              <div class="py-2 md:py-0">
                {#if session && session.uid !== article.author}
                  <span class="mt-0.5 cursor-pointer hover:text-red-600">
                    <Report size="1rem"/>
                  </span>
                {/if}
                {#if article.author === session?.uid}
                  <a href="/community/{article.board}/{article._key}/edit"
                     class="inline-block mt-0.5 cursor-pointer hover:text-sky-400">
                    <Edit size="1rem"/>
                  </a>
                {/if}
                {#if article.author === session?.uid || session?.rank <= EUserRanks.Manager}
                  <span class="mt-0.5 cursor-pointer hover:text-red-400">
                    <Delete size="1rem"/>
                  </span>
                {/if}
              </div>
              <div class="py-2 md:py-0">
                {#if session?.rank >= EUserRanks.Manager}
                  <span class="mt-0.5 cursor-pointer hover:text-red-400">
                    <Admin size="1rem"/>
                  </span>
                {/if}
              </div>
            </div>
          </div>
          <div class="flex flex-col md:flex-col">
            <span><View size="1rem"/> {article.views ?? 1}</span>

            <button data-tooltip-target="tooltip-time-specific" type="button">
              <time class="text-zinc-500 dark:text-zinc-300 text-sm">
                {timeAgo.format(new Date(article.createdAt))}
              </time>
            </button>

            <div id="tooltip-time-specific" role="tooltip"
                 class="inline-block absolute invisible z-10 py-2 px-3 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 transition-opacity duration-300 tooltip dark:bg-gray-700">
              작성 시간: {timeFullFormat(article.createdAt)}
              <div class="tooltip-arrow" data-popper-arrow></div>
            </div>
          </div>
        </div>
        <div class="flex space-x-3">
          <div class="w-12 min-h-[3rem] inline-block">
            <CircleAvatar/>
          </div>
          <span class="mt-2.5 inline-block leading-none hover:text-sky-400">{author?.id}</span>
        </div>
      </div>
      <article class="p-2 min-h-[10rem]">
        <Content contents="{contents}"/>
      </article>
      <div class="pt-3">
        <ul class="space-x-2 flex flex-wrap">
          {#if session}
            <li on:click={() => vote('like')}
                class:cursor-not-allowed={session.uid === article.author}
                class:cursor-pointer={session.uid !== article.author}
                class="inline-block text-sky-400 hover:text-sky-600 mb-2" reserved>
              <Tag>
                {#if liked}
                  <Like size="1rem"/>
                {:else}
                  <LikeEmpty size="1rem"/>
                {/if}
                {likeCount}
              </Tag>
            </li>
            <li on:click={() => vote('dislike')}
                class:cursor-not-allowed={session.uid === article.author}
                class:cursor-pointer={session.uid !== article.author}
                class="inline-block text-red-400 hover:text-red-600 mb-2" reserved>
              <Tag>
                {#if disliked}
                  <Dislike size="1rem"/>
                {:else}
                  <DislikeEmpty size="1rem"/>
                {/if}
                {dislikeCount}
              </Tag>
            </li>
          {/if}
          {#each Object.keys(article.tags) as tagName}
            {#if !tagName.startsWith('_')}
              <li class="inline-block mb-2 cursor-pointer">
                <Tag count="{article.tags[tagName]}">{tagName}
                  {#if isMyTag(tagName)}<span class="text-gray-600 leading-none __icon-fix"><RemoveTag
                    size="1rem"/></span>{/if}
                </Tag>
              </li>
            {/if}
          {/each}

          {#if session}
            <li class="inline-block mb-2 cursor-pointer">
              <Tag>
                <Plus size="1rem"/>
                새 태그 추가
              </Tag>
            </li>
          {/if}
        </ul>
      </div>
    </div>

    <div class="w-11/12 sm:w-5/6 md:w-4/5 lg:w-3/5 mx-auto"> <!-- 댓글 -->


      <ul class="space-y-2">

        {#each comments as comment}
          <li in:fade>
            <Comment user="{users[comment.author]}" {session} {comment}/>
          </li>
        {/each}

      </ul>

      <p class="mt-8 text-zinc-500 text-lg text-center">
        {#if isEmpty(comments)}
          댓글이 없어요...
        {:else}
          끝
        {/if}
      </p>
    </div>
  </div>

  <div class="relative w-11/12 sm:w-5/6 md:w-4/5 lg:w-3/5 mx-auto">
    <div class="absolute" style="bottom: {session ? '9' : '2'}rem; left: -0.5rem;">
      <ul class="space-y-2">
        <li>
          <!-- todo: add page parameter -->
          <button on:click={() => goto(`/community/${article.board}/`)}
                  class="bg-sky-400 hover:bg-sky-600 dark:bg-sky-800 dark:hover:bg-sky-600
                  text-white dark:text-zinc-200 shadow-md __circle w-10 h-10 transition-colors">
            <span><Back size="1rem"/></span>
          </button>
        </li>
        <li>
          <button class="bg-sky-400 hover:bg-sky-600 dark:bg-sky-800 dark:hover:bg-sky-600
         text-white dark:text-zinc-200 shadow-md __circle w-10 h-10 transition-colors">
            <span><Up size="1rem"/></span>
          </button>
        </li>
        <li>
          <button class="bg-sky-400 hover:bg-sky-600 dark:bg-sky-800 dark:hover:bg-sky-600
         text-white dark:text-zinc-200 shadow-md __circle w-10 h-10 transition-colors">
            <span><Down size="1rem"/></span>
          </button>
        </li>
      </ul>
    </div>
    {#if session}
      <div
        class="overflow-hidden rounded-t-md shadow-md bg-gray-50/50 h-32 flex flex-col relative __comment-input">
        <div class="px-2">
          <input type="file" class="hidden"/>
          <button class="text-zinc-700 hover:text-zinc-900 p-1 cursor-pointer ">
            <Favorite size="1.25rem"/>
          </button>
          <button class="text-zinc-700 hover:text-zinc-900 p-1 cursor-pointer ">
            <Upload size="1.25rem"/>
          </button>
        </div>
        <div class="w-full flex flex-row grow shrink-0">
      <textarea class="bg-gray-100 dark:bg-gray-300 p-4 grow h-full focus:outline-none shadow-md dark:text-gray-800"
                on:keydown={detectSend} bind:value={commentContent}
                placeholder="댓글을 입력하세요..."></textarea>
          <button on:click={addComment} class="px-4 bg-sky-200 dark:bg-sky-800">작성</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  //noinspection CssInvalidPropertyValue
  .__fixed-view {
    height: calc(100vh - 62px);
    // for mobile
    @supports (-webkit-appearance:none) {
      height: calc(var(--vh, 1vh) * 100 - 62px - env(safe-area-inset-bottom));
    }
  }

  .__comment-input {

  }

  .__circle {
    border-radius: 50%;
  }

  :global {
    .__icon-fix {
      svg {
        vertical-align: text-top;
        margin-top: 2px;
      }
    }


  }
</style>
