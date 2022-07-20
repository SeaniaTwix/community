<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import type {IComment} from '$lib/types/comment';
  import type {IUser} from '$lib/types/user';
  import {uniq, isEmpty} from 'lodash-es';
  import * as cheerio from 'cheerio';
  import {ArticleDto} from '$lib/types/dto/article.dto';

  export async function load({params, fetch, session}: LoadEvent): Promise<LoadOutput> {
    const nr = await fetch(`/community/${params.id}/api/info`);
    const {name} = await nr.json();
    const res = await fetch(`/community/${params.id}/${params.article}/api/read`);
    const {article} = await res.json() as ArticleDto;
    const $ = cheerio.load(`<div class="__top">${article.content}</div>`);
    // @ts-ignore
    const elems = $('.__top:first > *').toArray();
    const contents = [];
    for (const elem of elems) {
      // console.log(elem);
      contents.push(cheerio.load(elem).html());
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

    const findImages = cheerio.load(article.content)('img').toArray();
    let mainImage: string;
    if (findImages.length > 0) {
      mainImage = findImages[0].attribs['src'];
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
        mainImage,
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
  import {onMount, onDestroy, tick} from 'svelte';
  import {Pusher} from '$lib/pusher/client';
  import {fade} from 'svelte/transition';
  import CircleAvatar from '$lib/components/CircleAvatar.svelte';
  import {dayjs} from 'dayjs';
  import {EUserRanks} from '$lib/types/user-ranks';
  import Tag from '$lib/components/Tag.svelte';
  import Comment from '$lib/components/Comment.svelte';
  import type {Subscription} from 'rxjs';
  import {goto} from '$app/navigation';
  import {inRange, remove} from 'lodash-es';
  import Content from '$lib/components/Content.svelte';
  import {writable} from 'svelte/store';
  import EditImage from '$lib/components/EditImage.svelte';
  import {upload} from '$lib/file/uploader';
  import {striptags} from 'striptags';
  import {page} from '$app/stores';

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
  export let mainImage: string | undefined;
  // noinspection TypeScriptUnresolvedFunction
  let liked = article.myTags?.includes('_like');
  // noinspection TypeScriptUnresolvedFunction
  let disliked = article.myTags?.includes('_dislike');
  $: likeCount = article.tags?._like ?? 0;
  $: dislikeCount = article.tags?._dislike ?? 0;

  /**
   * 대댓글 등의 댓글 id가 들어올 수 있습니다.
   * 여기에 id가 들어오면 대댓글 모드가 됩니다.
   */
  let relative: string | undefined;

  let commentImageUrl = '';
  let commentContent = '';

  let commenting = false;

  let showingImageEditor = false;
  let mobileInputMode = false;
  let mobileTextInput: HTMLTextAreaElement;
  let mobileInputLastCursor = 0;
  let generalScrollView: HTMLDivElement;

  let commentImageUploadSrc = '';
  let commentImageUploadFileInfo: File;
  let editedImage: Blob;

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
    /*
    if (commentImageUrl) {
      commentData.image = commentImageUrl;
    }*/
    if (!isEmpty(commentImageUploadSrc)) {
      const data = editedImage ? editedImage : commentImageUploadFileInfo;
      const type = editedImage ? 'image/png' : commentImageUploadFileInfo.type;
      const name = 'UZ-is-Kawaii.png';
      commentData.image = await upload(data, type, name);
    }

    try {

      // console.log(commentData);
      // return;
      await ky.post(`/community/${article.board}/${article._key}/api/comment`, {
        json: commentData,
      }); // .json();

      // console.log(result);

    } finally {
      commentContent = '';
      commenting = false;
      mobileTextInput?.blur();
      cancelImageUpload();
    }

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
    // noinspection TypeScriptUnresolvedFunction
    return article.myTags?.includes(tagName)
  }

  let prevVisualViewport = 0;

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
      // noinspection TypeScriptUnresolvedVariable
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
      // noinspection TypeScriptUnresolvedVariable
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

  function openImageEditor() {
    showingImageEditor = true;
  }

  function closeImageEditor() {
    showingImageEditor = false;
  }

  function imageLoadCompletedInComment(element: HTMLImageElement) {
    URL.revokeObjectURL(element.src);
  }

  function imageUpload(file: File | Blob, type?: string) {
    return new Promise<string>(async (resolve, reject) => {
      try {
        // const file = blobInfo.blob();
        const request = await ky.post(`/file/request?type=${file.type ?? type}`)
          .json<{ uploadUrl: string, key: string }>();
        await ky.put(request.uploadUrl, {
          body: file,
          // onDownloadProgress: console.log,
        });
        // console.log(blobInfo.blob());
        resolve(`https://s3.ru.hn/${request.key}`);
      } catch (e) {
        reject(e);
      }
    });
  }

  // so hacky
  //*
  function focusOutTextArea(event: Event) {
    console.log('body:', document.body.scrollHeight)
  } //*/

  function fileSelected() {
    fileChangeListener.set(fileUploader.files[0]);
  }

  function blockMobileScroll(event: Event) {
    event.preventDefault();
  }

  async function enableMobileInput() {
    mobileInputMode = true;
    await tick();
    mobileTextInput.focus();
    await tick();
    mobileTextInput.selectionStart = mobileInputLastCursor;
    mobileTextInput.selectionEnd = mobileInputLastCursor;

    visualViewport.addEventListener('touchmove', blockMobileScroll, true);
  }

  let lastScrollTop = 0;
  function disableMobileInput() {
    setTimeout(() => {
      visualViewport.removeEventListener('touchmove', blockMobileScroll, true);

      mobileInputMode = false;
      mobileInputLastCursor = mobileTextInput.selectionEnd;
      setTimeout(() => {
        generalScrollView.scrollTop = lastScrollTop;
      }, 5);
    }, 10);
  }

  function saveLastScroll(event: Event) {
    const target = event.target as HTMLDivElement;
    if (target && !mobileInputMode) {
      lastScrollTop = target.scrollTop;
      // console.log('lastScrollTop:', lastScrollTop);
    }
  }

  function cancelImageUpload() {
    commentImageUploadSrc = '';
    commentImageUploadFileInfo = undefined;
    editedImage = undefined;
  }

  async function imageEditedInComment(event: CustomEvent<Blob>) {
    commentImageUploadSrc = URL.createObjectURL(event.detail);
    editedImage = event.detail;
    await tick();
    closeImageEditor();
  }

  async function deleteComment(comment: IComment) {
    try {
      await ky.delete(
        `/community/${article.board}/${article._key}/comments/${comment._key}/api/manage`)
    } catch {
      // todo: alert delete failed
    }
  }

  let fileUploader: HTMLInputElement;
  const fileChangeListener = writable<File>(null);
  let subscriptions: Subscription[] = [];
  let pusher: Pusher;
  let unsub: () => void;
  onMount(async () => {
    // console.log(article);

    pusher = new Pusher(`${article._key}@${article.board}`);

    document.body.classList.add('overflow-hidden');
    // document.addEventListener('scroll', focusOutTextArea, true);
    // console.log(window.visualViewport.height);

    try {
      prevVisualViewport = window.visualViewport.height;

      // window.visualViewport.addEventListener('resize', fixIosKeyboardScrolling, true);

      ky.put(`/community/${article.board}/${article._key}/api/viewcount`).then();

      const whenCommentChanged = async ({body}) => {
        console.log('comment:', body);
        if (typeof body.author === 'string') {
          await userNameExistingCheck(body.author);

          if (body.content || body.image) {
            const newComment: IComment = {
              ...body,
              createdAt: new Date,
            };
            comments = [...comments, newComment];
          }

          if (body.type === 'del') {
            const key = body.target;
            // comments = comments.filter((c: IComment) => c._key !== key);
            const target = comments.find(comment => comment._key === key) as IComment & {deleted: boolean};
            if (target) {
              target.deleted = true;
            }
            console.log(target);
            comments = [...comments];
          }

          if (body.type === 'edit') {
            // todo edit comment
          }
        }
      };

      const whenTagChanged = async ({body}) => {
        // await userNameExistingCheck(body.author);
        const tags = body.tag as string[];
        const type = body.type as 'add' | 'remove';
        if (tags) {
          for (const tag of tags) {
            if (type === 'add') {
              // noinspection TypeScriptUnresolvedFunction
              if (Object.hasOwn(article.tags, tag)) {
                article.tags[tag] += 1;
              } else {
                article.tags[tag] = 1;
              }
            } else { // remove
              if (article.tags[tag] <= 1) {
                // svelte don't recognize when property deleted
                const newTags = {...article.tags};
                delete newTags[tag];
                article.tags = newTags;
              } else {
                article.tags[tag] -= 1;
              }
            }
          }
        }
      };

      const whenVoteChanged = async ({body}: {body: IMessageVote}) => {
        if (body.comment) {
          const comment = comments.find(comment => comment._key === body.comment);
          if (comment) {
            if (!comment.votes) {
              comment.votes = {like: 0, dislike: 0};
            }
            const amount = body.amount;
            await tick();
            comment.votes[body.type] += amount;
          }
          comments = [...comments];
          await tick();
        }
      }

      const observable = pusher.observable('comments');
      subscriptions.push(observable.subscribe(whenCommentChanged));
      console.log(subscriptions);
      const tagChange = pusher.observable('tag');
      subscriptions.push(tagChange.subscribe(whenTagChanged));
      const commentVoteChange = pusher.observable('comments:vote');
      subscriptions.push(commentVoteChange.subscribe(whenVoteChanged as any));

      // window.document.body.addEventListener('scroll', preventScrolling, true);

      unsub = fileChangeListener.subscribe(async (file) => {
        if (!file) return;
        // const url = await imageUpload(file);
        commentImageUploadFileInfo = file;
        commentImageUploadSrc = URL.createObjectURL(file);
      });
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
      // document.removeEventListener('scroll', focusOutTextArea, true);
      //window?.visualViewport.removeEventListener('resize', fixIosKeyboardScrolling, true);
      // window.document.body.removeEventListener('scroll', preventScrolling, true);

      document.body.classList.remove('overflow-hidden');
    } catch {
      // no window. it's ok.
    }
  });

  function timeFullFormat(time: Date | number) {
    return dayjs(new Date(time)).format('YYYY년 M월 D일 HH시 m분');
  }

  interface IMessageVote {
    comment: string;
    type: 'like' | 'dislike';
    amount: number;
    author: string;
  }

  let fileDragging = false;

  function fileDrag(event: DragEvent) {
    // noinspection TypeScriptUnresolvedFunction
    if (event.dataTransfer.types.includes('Files')) {
      fileDragging = true;
    }
  }

  function fileDragLeaveCheck(event: DragEvent) {
    fileDragging = false;
  }

  async function fileDrop(event: DragEvent) {
    await tick();
    fileDragging = false;
    const uploadPending = event.dataTransfer.files.item(0);
    if (uploadPending.type.startsWith('image')) {
      commentImageUploadSrc = URL.createObjectURL(uploadPending);
      commentImageUploadFileInfo = uploadPending;
    }
  }
</script>

<svelte:head>
  <title>{boardName} - {article.title}</title>

  <!-- Primary Meta Tags -->
  <meta name="title" content="{article.title}">
  <meta name="description" content="{striptags(article.content)}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="{$page.url.origin}/community/{article.board}/{article._key}">
  <meta property="og:title" content="{article.title}">
  <meta property="og:description" content="{striptags(article.content)}">
  {#if mainImage}
    <meta property="og:image" content="{mainImage}">
  {/if}

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="{$page.url.origin}/community/{article.board}/{article._key}">
  <meta property="twitter:title" content="{article.title}">
  <meta property="twitter:description" content="{striptags(article.content)}">
  {#if mainImage}
    <meta property="twitter:image" content="{mainImage}">
  {/if}

</svelte:head>

<svelte:body on:dragover|preventDefault={fileDrag} />

{#if fileDragging}
  <div on:drop|preventDefault={fileDrop}
       on:dragleave|preventDefault={fileDragLeaveCheck}
       class="absolute top-0 z-[12] left-0 w-full h-screen bg-white/50 dark:bg-gray-700/50">
    <span class="__center-text text-white px-4 py-2 bg-gray-900/50 rounded-md">
      파일을 떨어뜨려 업로드 혹은 편집 할 수 있습니다.
    </span>
  </div>
{/if}

<div id="__index-hidden-for-file-and-class-preload"
     class="touch-none hidden cursor-not-allowed cursor-progress overscroll-none">
  <input type="file" bind:this={fileUploader} on:change={fileSelected}/>
</div>

<div class="hidden absolute w-screen h-screen bg-gray-700/50 z-10 top-0">

</div>

{#if showingImageEditor}
  <EditImage on:close={closeImageEditor} on:save={imageEditedInComment} bind:src="{commentImageUploadSrc}" />
{/if}

<div class="w-full absolute z-[11] bg-white dark:bg-gray-600 px-4">
  <div id="__breadcrumb"
       class="flex justify-between w-full w-11/12 sm:w-5/6 md:w-4/5 lg:w-3/5 mx-auto pb-1 border-b dark:border-zinc-500">
    <nav class="flex ml-4 grow-0 shrink" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <a href="/"
             class="inline-flex items-center text-sm font-medium text-gray-700 hover:text-sky-400 hover:drop-shadow dark:text-gray-400 dark:hover:text-white dark:hover:shadow-white w-max">
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
               class="ml-1 text-sm font-medium text-gray-700 md:ml-2 dark:text-gray-400 dark:hover:text-white hover:text-sky-400 hover:drop-shadow w-max">
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
             dark:text-gray-400 text-ellipsis overflow-hidden hover:drop-shadow">
              {article.title}
            </span>
          </div>
        </li>
      </ol>
    </nav>
  </div>
</div>

<div in:fade class="flex flex-col justify-between" class:__fixed-view={!mobileInputMode}>
  {#if !mobileInputMode}
    <div bind:this={generalScrollView}
         class="mt-4 p-4 space-y-4 overflow-y-scroll flex-grow"
         on:scroll={saveLastScroll}>
      <div class="w-11/12 sm:w-5/6 md:w-4/5 lg:w-3/5 mx-auto p-4 rounded-md shadow-md transition-transform divide-y divide-dotted">
        <div class="space-y-2 mb-4">
          <div class="flex justify-between">
            <div class="flex space-x-2 flex-col md:flex-row lg:flex-row">
              <h2 class="text-2xl flex-shrink">{article.title}</h2>
              <div class="inline-block flex space-x-2">
                <div class="py-2 md:py-0.5">
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
                  {#if article.author === session?.uid || session?.rank >= EUserRanks.Manager}
                  <span class="mt-0.5 cursor-pointer hover:text-red-400">
                    <Delete size="1rem"/>
                  </span>
                  {/if}
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
        {#if article.source}
          <div class="rounded-sm overflow-hidden">
            <p class="px-4 py-2 border-l-2 border-sky-400 select-none dark:bg-zinc-600">
              출처 <a class="text-sky-300 hover:text-sky-400 transition-colors select-text"
                    href="{article.source}">{article.source}</a>
            </p>
          </div>
        {/if}
        <article class="pt-4 pb-2 min-h-[10rem]">
          <Content contents="{contents}" nsfw="{!!article.tags['후방']}"/>
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
                    {#if isMyTag(tagName)}<span class="text-gray-600 dark:text-gray-400 leading-none __icon-fix"><RemoveTag
                      size="1rem"/></span>{/if}
                  </Tag>
                </li>
              {/if}
            {/each}

            {#if session}
              <li class="inline-block mb-2 cursor-pointer">
                <Tag>
                  <Plus size="1rem"/>
                  <span>새 태그 추가</span>
                </Tag>
              </li>
            {/if}
          </ul>
        </div>
      </div>

      <div class="w-11/12 sm:w-5/6 md:w-4/5 lg:w-3/5 mx-auto"> <!-- 댓글 -->


        <ul class="space-y-3">

          {#each comments as comment}
            <li in:fade class="relative">
              <Comment board="{article.board}"
                       article="{article._key}"
                       user="{users[comment.author]}"
                       myVote="{comment.myVote}"
                       on:delete={() => deleteComment(comment)}
                       {session}
                       {comment}/>
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
  {:else}



    <div class="mt-6 p-2">
      <h2 class="text-xl mb-2">댓글 작성 중...</h2>

      <div class="overflow-hidden rounded-t-md bg-gray-50/50 h-32 flex flex-col relative __comment-input">
        <div class="px-2">
          {#if isEmpty(commentImageUploadSrc)}
            <button class="text-zinc-700 hover:text-zinc-900 p-1 cursor-pointer ">
              <Favorite size="1.25rem"/>
            </button>
            <button on:click={() => fileUploader.click()} class="text-zinc-700 hover:text-zinc-900 p-1 cursor-pointer ">
              <Upload size="1.25rem"/>
            </button>
          {:else}
            <button on:click={cancelImageUpload} class="text-zinc-700 hover:text-red-600 p-1 cursor-pointer ">
              <span><Delete size="1.25rem"/> 파일을 지우려면 여기 클릭하세요</span>
            </button>
          {/if}
        </div>
        <div class="flex flex-grow">

          {#if !isEmpty(commentImageUploadSrc)}
            <div on:click={openImageEditor} class="flex-shrink-0 w-24 border-4 border-zinc-100 dark:border-gray-300/50 hover:border-sky-400 dark:hover:border-sky-500 cursor-pointer select-none">
              <img class="w-full h-full object-cover bg-white dark:bg-gray-600"
                   on:load={imageLoadCompletedInComment}
                   src="{commentImageUploadSrc}" alt="upload preview" />
            </div>
          {/if}
          <div class="bg-gray-100 dark:bg-gray-300 p-3 flex-grow shadow-md dark:text-gray-800 h-full">
              <textarea class="w-full h-full bg-transparent focus:outline-none overflow-y-scroll overscroll-contain resize-none touch-none"
                        on:keydown={detectSend}
                        bind:value={commentContent}
                        bind:this={mobileTextInput}
                        on:blur={disableMobileInput}
                        placeholder="댓글을 입력하세요..."></textarea>
          </div>

        </div>
      </div>

      <button on:click={addComment} class="py-2 bg-sky-200 dark:bg-sky-800 w-full">작성</button>
    </div>



  {/if}
  {#if !mobileInputMode}
    <div class="relative w-11/12 sm:w-5/6 md:w-4/5 lg:w-3/5 mx-auto">
      <div id="__simple-navigator" class="absolute left-[-0.5rem] sm:left-[-1.5rem]" style="bottom: {session ? '9' : '2'}rem;">
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
        <div class="overflow-hidden rounded-t-md shadow-md bg-gray-50/50 h-32 flex flex-col relative __comment-input">
          <div class="px-2">
            {#if isEmpty(commentImageUploadSrc)}
              <button class="text-zinc-700 hover:text-zinc-900 p-1 cursor-pointer ">
                <Favorite size="1.25rem"/>
              </button>
              <button on:click={() => fileUploader.click()} class="text-zinc-700 hover:text-zinc-900 p-1 cursor-pointer ">
                <Upload size="1.25rem"/>
              </button>
            {:else}
              <button on:click={cancelImageUpload} class="text-zinc-700 hover:text-red-600 p-1 cursor-pointer ">
                <span><Delete size="1.25rem"/> 파일을 지우려면 여기 클릭하세요</span>
              </button>
            {/if}
          </div>
          <div class="w-full flex flex-row grow shrink-0">
            <div class="flex flex-grow">
              {#if !isEmpty(commentImageUploadSrc)}
                <div on:click={openImageEditor} class="flex-shrink-0 w-24 border-4 border-zinc-100 dark:border-gray-300/50 hover:border-sky-400 dark:hover:border-sky-500 cursor-pointer select-none">
                  <img class="w-full h-full object-cover bg-white dark:bg-gray-600"
                       on:load={imageLoadCompletedInComment}
                       src="{commentImageUploadSrc}" alt="upload preview" />
                </div>
              {/if}
              <div class="bg-gray-100 dark:bg-gray-300 p-3 flex-grow shadow-md dark:text-gray-800 h-full">
              <textarea id="__textarea-general" class="w-full h-full bg-transparent focus:outline-none overflow-y-scroll overscroll-contain resize-none touch-none"
                        on:keydown={detectSend} bind:value={commentContent}
                        placeholder="댓글을 입력하세요..."></textarea>
                <div id="__textarea-mobile"
                     on:click={enableMobileInput} on:dblclick|preventDefault
                     class="w-full h-full bg-transparent focus:outline-none overflow-y-scroll overscroll-contain resize-none touch-none">
                  {#if isEmpty(commentContent)}
                    <span class="text-[#9DA3AE]">댓글을 입력하세요...</span>
                  {:else}
                    {commentContent}
                  {/if}
                </div>
              </div>
            </div>
            <button on:click={addComment} class="px-4 bg-sky-200 dark:bg-sky-800">작성</button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  //noinspection CssInvalidPropertyValue
  .__fixed-view {
    height: calc(100vh - 62px);
    // for mobile
    @supports (-webkit-touch-callout: none) {
      height: calc(var(--vh, 1vh) * 100 - 62px );
      // padding-bottom: env(safe-area-inset-bottom);
    }
  }

  // https://stackoverflow.com/questions/35361986/css-gradient-checkerboard-pattern
  .__bg-checkerboard {
    background-image: linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  }

  #__textarea-general {
    display: block;
    @supports (-webkit-touch-callout: none) {
      display: none;
    }
  }

  #__textarea-mobile {
    display: none;
    @supports (-webkit-touch-callout: none) {
      display: block;
    }
  }

  .__circle {
    border-radius: 50%;
  }

  .__center-text {
    margin: 0;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
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
