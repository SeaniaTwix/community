<script lang="ts" context="module">
  import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
  import type {IComment} from '$lib/types/comment';
  import type {IUser} from '$lib/types/user';
  import {isEmpty, uniq} from 'lodash-es';
  import * as cheerio from 'cheerio';
  import {ArticleDto} from '$lib/types/dto/article.dto';
  import HttpStatus from 'http-status-codes';

  export async function load({params, fetch}: LoadEvent): Promise<LoadOutput> {
    const nr = await fetch(`/community/${params.id}/api/info`);
    const {name} = await nr.json();
    const res = await fetch(`/community/${params.id}/${params.article}/api/read`);
    if (res.status !== HttpStatus.OK) {
      const {reason} = await res.json() as {reason: string};
      return {
        status: res.status,
        error: reason,
      }
    }
    const {article} = await res.json() as ArticleDto;
    if (!article) {
      return {
        status: HttpStatus.NOT_FOUND,
        error: '게시글을 찾을 수 없습니다.'
      }
    }
    const $ = cheerio.load(`<div class="__top">${article.content}</div>`);
    // @ts-ignore
    const elems = $('.__top:first > *').toArray();
    const contents = [];
    for (const elem of elems) {
      // console.log(elem);
      contents.push(cheerio.load(elem).html());
    }
    // const ar = await fetch(`/user/profile/api/detail?id=${article.author}`);
    // const {user} = await ar.json();
    const cr = await fetch(`/community/${params.id}/${params.article}/api/comment`);
    const {comments} = await cr.json() as { comments: IComment[] };
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
        // author: user,
        comments,
        users: userInfo,
        mainImage,
      },
    };
  }
</script>
<!--suppress TypeScriptValidateTypes -->
<script lang="ts">
  import Up from 'svelte-material-icons/ArrowUp.svelte';
  import Down from 'svelte-material-icons/ArrowDown.svelte';
  import Back from 'svelte-material-icons/KeyboardBackspace.svelte';
  import type {IArticle} from '$lib/types/article';
  import ky from 'ky-universal';
  import {onMount, onDestroy, tick} from 'svelte';
  import {Pusher} from '$lib/pusher/client';
  import {fade} from 'svelte/transition';
  import Comment from '$lib/components/Comment.svelte';
  import {afterNavigate, goto} from '$app/navigation';
  import {writable} from 'svelte/store';
  import type {Unsubscriber} from 'svelte/store';
  import EditImage from '$lib/components/EditImage.svelte';
  import {upload} from '$lib/file/uploader';
  import {striptags} from 'striptags';
  import {page, session} from '$app/stores';
  import Cookies from 'js-cookie';
  import {commentInput, commentMobileCursorPosition, currentReply, highlighed} from '$lib/community/comment/client';
  import Article from '$lib/components/Article.svelte';
  import {deletedComment} from '$lib/community/comment/client';
  import CommentInput from '$lib/components/CommentInput.svelte';

  /**
   * 게시글 보기
   */

  interface TagType {
    [tagName: string]: number;
  }

  export let article: IArticle<TagType, IUser> = undefined;
  export let contents: string[] = [];
  export let boardName: string;
  // eslint-disable-next-line no-undef
  // export let author: IUser;
  export let users: Record<string, IUser>;
  export let comments: IComment[];
  $: noRelativeComments = comments.filter(comment => !comment.relative);
  const bestComments = comments
    .filter(comment => comment.votes.like - comment.votes.dislike >= 1)
    .sort((a, b) => {
      const aLike = a.votes.like - a.votes.dislike;
      const bLike = b.votes.like - a.votes.dislike;

      const like = bLike - aLike;

      if (like !== 0) {
        return like;
      }

      const at = (new Date(a.createdAt)).getTime();
      const bt = (new Date(b.createdAt)).getTime();

      return at - bt;
    })
    .slice(0, 5);
  export let mainImage: string | undefined;
  // eslint-disable-next-line no-redeclare
  declare var commentFolding: boolean;
  // noinspection TypeScriptUnresolvedVariable
  $: commentFolding = $session.ui.commentFolding;

  let commentTextInput: HTMLTextAreaElement;
  let commentContent = '';

  let commenting = false;

  let showingImageEditor = false;
  let mobileInputMode = false;
  let mobileTextInput: HTMLTextAreaElement;
  let mobileInputLastCursor = 0;
  let generalScrollView: HTMLDivElement;
  let mobileCommentInputModeScrollView: HTMLDivElement;

  let commentImage1: HTMLImageElement;
  let commentImage2: HTMLImageElement;
  let commentImageUploadSrc = '';
  let commentImageUploadFileInfo: File;
  let editedImage: Blob;
  let image100x100 = false;
  let imageSize = {
    x: -1,
    y: -1,
  }

  async function addComment() {
    if (!$session.user && !commenting) {
      return;
    }

    commenting = true;

    try {
      const commentData: IComment = {
        article: article._key,
        content: commentContent,
      };

      if (selectedComment) {
        commentData.relative = selectedComment._key;
      }

      if (!isEmpty(commentImageUploadSrc)) {
        if (commentImageUploadSrc.startsWith('https://s3.ru.hn')) {
          commentData.image = commentImageUploadSrc;
        } else {
          const data = editedImage ? editedImage : commentImageUploadFileInfo;
          const type = editedImage ? 'image/png' : commentImageUploadFileInfo.type;
          const name = 'UZ-is-Kawaii.png';
          commentData.image = await upload(data, type, name);
        }
      }

      if (image100x100) {
        commentData.imageSize = {x: 100, y: 100};
      } else if (imageSize.x > 0 && imageSize.y > 0) {
        commentData.imageSize = imageSize;
      } else if (commentData.image) {
        const getNaturalSize = new Promise<{x: number, y: number}>((resolve) => {
          const img = new Image();
          img.addEventListener('load', () => {
            resolve({x: img.naturalWidth, y: img.naturalHeight});
          })
          img.src = commentData.image;
        });
        commentData.imageSize = await getNaturalSize;
      }

      commentTextInput?.blur();

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
      if (selectedComment) {
        disableReplyMode().then();
      }
    }

  }

  async function disableReplyMode() {
    selectedComment = undefined;
    currentReply.set(undefined);
    // if you want to blur, just try hitting again escape key.
    commentTextInput.focus();
    setTimeout(() => {
      generalScrollView.scrollTop = lastScrollTop;
    }, 5);
  }

  async function onBlurGeneralCommentInput(event: CustomEvent<boolean>) {
    if (selectedComment && event.detail) {
      event.preventDefault();
      await disableReplyMode();
      return;
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

  function fileSelected() {
    fileChangeListener.set(fileUploader.files[0]);
  }

  function blockMobileScroll(event: Event) {
    event.preventDefault();
  }

  // ios only...
  async function enableMobileInput() {
    saveLastScroll();
    commentFolding = false;
    mobileInputMode = true;
    await tick();
    $commentInput?.focus();

    setTimeout(() => {
      mobileCommentInputModeScrollView.scrollTop = mobileCommentInputModeScrollView.scrollHeight + 500;
    }, 100);

    visualViewport.addEventListener('touchmove', blockMobileScroll, true);
  }

  let lastScrollTop = 0;
  function disableMobileInput() {
    setTimeout(() => {
      visualViewport.removeEventListener('touchmove', blockMobileScroll, true);

      mobileInputMode = false;
      mobileInputLastCursor = mobileTextInput.selectionEnd;
      if (selectedComment) {
        currentReply.set(undefined);
        selectedComment = undefined;
      }
      setTimeout(() => {
        generalScrollView.scrollTop = lastScrollTop;
      }, 5);
    }, 10);
  }

  type FavImageSelectedData = {
    fav: {src: string, size: {x: number, y: number}},
    disable: () => void,
  }
  async function commentFavoriteImageSelected(event: CustomEvent<FavImageSelectedData>) {
    const {fav, disable} = event.detail;
    commentImageUploadSrc = fav.src;
    imageSize = fav.size;
    console.log(fav);
    disable();
  }

  function saveLastScroll() {
    if (generalScrollView && (!mobileInputMode || !selectedComment)) {
      lastScrollTop = generalScrollView.scrollTop;
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

  async function toggleCommentFold(event: CustomEvent<HTMLTextAreaElement>) {
    const folding = Cookies.get('comment_folding') === 'true';
    commentFolding = !folding;
    Cookies.set('comment_folding', commentFolding.toString());
    session.update((s) => {
      s.ui.commentFolding = !folding;
      return s;
    });
    if (!commentFolding) {
      await tick();
      event.detail.focus();
    }
  }

  function goBack() {
    if (selectedComment) {
      return disableReplyMode();
    }
    if ($page.url.search.includes('type=best')) {
      const q = $page.url.search.slice(1).split('&');
      const noBestQuery = q.filter(v => v !== 'type=best');
      const result = isEmpty(q) ? '' : `?${noBestQuery.join('&')}`;
      return goto(`/community/${article.board}/best${result}`);
    }
    goto(`/community/${article.board}${$page.url.search}`);
  }

  afterNavigate(({from, to}) => {
    if (from?.pathname !== to.pathname) {
      $highlighed = undefined;

      if (pusher) {
        pusher.close();
      }

      // console.log(`new sub => ${article._key}@${article.board}`);

      pusher = new Pusher(`${article._key}@${article.board}`);

      const whenCommentChanged = async ({body}) => {
        // console.log('comment:', body);
        if (typeof body.author === 'string') {
          await userNameExistingCheck(body.author);

          if (body.relative) {
            const newComment: IComment = {
              ...body,
              myVote: {like: false, dislike: false},
              createdAt: new Date
            };
            comments = [...comments, newComment];
            return;
          }

          if (body.content || body.image) {
            const newComment: IComment = {
              ...body,
              myVote: {like: false, dislike: false},
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
            // console.log(target);
            comments = [...comments];
          }

          if (body.type === 'edit') {
            // todo edit comment
          }
        }
      };

      // article votes included
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

      // comment votes only
      const whenVoteChanged = async ({body}: {body: IMessageVote}) => {
        if (body.comment) {
          const comment = comments.find(comment => comment._key === body.comment);
          if (comment) {
            if (!comment.votes) {
              comment.votes = {like: 0, dislike: 0};
            }
            if (typeof comment.votes?.like !== 'number') {
              comment.votes.like = 0;
            }
            if (typeof comment.votes?.dislike !== 'number') {
              comment.votes.dislike = 0;
            }
            const amount = body.amount;
            await tick();
            comment.votes[body.type] += amount;
          }
          comments = [...comments];
          await tick();
        }
      }

      pusher.subscribe<Partial<IComment>>('comments', whenCommentChanged);
      pusher.subscribe('tag', whenTagChanged);
      pusher.subscribe('comments:vote', whenVoteChanged);
    }
  })

  let fileUploader: HTMLInputElement;
  const fileChangeListener = writable<File>(null);
  let unsubscribers: Unsubscriber[] = [];
  let pusher: Pusher;
  onMount(async () => {
    if ($page.url.hash.startsWith('#c')) {
      $highlighed = $page.url.hash.slice(2);
    }

    try {
      document.querySelector('html').classList.add('__page-view');
      document.querySelector('body').classList.add('__page-view', 'overflow-hidden');
    } catch {
      // no window. it's okay
    }

    pusher = new Pusher(`${article._key}@${article.board}`);

    window.addEventListener('unload', clearSubscribes);

    try {
      ky.put(`/community/${article.board}/${article._key}/api/viewcount`).then();


      // window.document.body.addEventListener('scroll', preventScrolling, true);

      const fileChangeUnsub = fileChangeListener.subscribe(async (file) => {
        if (!file) return;
        // const url = await imageUpload(file);
        commentImageUploadFileInfo = file;
        commentImageUploadSrc = URL.createObjectURL(file);
      });

      const replyUnsub = currentReply.subscribe((currentReplyId) => {
        // console.log(currentReplyId)
        if (!currentReplyId) {
          return;
        }
        commentReplyClicked(currentReplyId);
      });

      const commentDeleteUnsub = deletedComment.subscribe((deleteCommentId) => {
        if (typeof deleteCommentId !== 'string') {
          return;
        }
        deleteComment({_key: deleteCommentId}).then(() => $deletedComment = undefined);
      });

      unsubscribers.push(fileChangeUnsub, replyUnsub, commentDeleteUnsub);

    } catch (e) {
      console.error(e);
    }
  });

  function clearSubscribes() {
    for (const unsub of unsubscribers) {
      unsub();
    }
    pusher?.close();
    currentReply.set(undefined);
  }

  onDestroy(() => {
    $commentMobileCursorPosition = 0;
    clearSubscribes();
    try {
      document.querySelector('html').classList.remove('__page-view');
      document.querySelector('body').classList.remove('__page-view', 'overflow-hidden');
    } catch {
      // no window. it's ok.
    }
  });

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

  let selectedComment: IComment | undefined;
  function commentReplyClicked(id) {
    if (!$session.user) {
      return;
    }
    saveLastScroll();
    selectedComment = comments.find((comment) => comment._key === id);
    const textGeneral = document.querySelector('#__textarea-general');
    const textMobile = document.querySelector('#__textarea-mobile');
    const isMobileTextEnabled = textMobile.clientHeight > textGeneral.clientHeight;

    if (isMobileTextEnabled) {
      enableMobileInput();
    } else {
      $commentInput?.focus();
    }
  }

  function toLiteralContent(content: string) {
    return striptags(content).trim().slice(0, 500);
  }

</script>

<svelte:head>
  <title>{boardName} - {article.title}</title>

  <!-- Primary Meta Tags -->
  <meta name="title" content="루헨 - {article.title}">
  <meta name="description" content="{toLiteralContent(article.content)}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="{$page.url.origin}/community/{article.board}/{article._key}">
  <meta property="og:title" content="루헨 - {article.title}">
  <meta property="og:description" content="{toLiteralContent(article.content)}">
  {#if mainImage && !article.tags['후방']}
    <meta property="og:image" content="{mainImage}">
  {/if}

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="{$page.url.origin}/community/{article.board}/{article._key}">
  <meta property="twitter:title" content="루헨 - {article.title}">
  <meta property="twitter:description" content="{toLiteralContent(article.content)}">
  {#if mainImage && !article.tags['후방']}
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
    <nav class="flex ml-4 grow-0 shrink w-full w-min-0" aria-label="Breadcrumb">
      <ol class="flex flex-row items-center space-x-1 md:space-x-3 w-full truncate">
        <li class="inline-flex items-center flex-shrink-0">
          <a href="/"
             class="inline-flex items-center text-sm font-medium text-gray-700 hover:text-sky-400 hover:drop-shadow dark:text-gray-400 dark:hover:text-white dark:hover:shadow-white w-max">
            <svg class="mr-2 w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
            </svg>
            홈
          </a>
        </li>
        <li class="flex-shrink-0">
          <div class="flex items-center">
            <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20"
                 xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"></path>
            </svg>
            <a href="/community/{article.board}{$page.url.search}"
               class="ml-1 text-sm font-medium text-gray-700 md:ml-2 dark:text-gray-400 dark:hover:text-white hover:text-sky-400 hover:drop-shadow w-max">
              {boardName}
            </a>
          </div>
        </li>
        {#if $page.url.search.includes('type=best')}
          <li class="flex-shrink-0">
            <div class="flex items-center">
              <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20"
                   xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clip-rule="evenodd"></path>
              </svg>
              <a href="/community/{article.board}/best"
                 class="ml-1 text-sm font-medium text-gray-700 md:ml-2 dark:text-gray-400 dark:hover:text-white hover:text-sky-400 hover:drop-shadow w-max">
                베스트
              </a>
            </div>
          </li>
        {/if}
        <li class="flex-shrink min-w-0" aria-current="page">
          <div class="flex items-center text-ellipsis overflow-hidden min-w-0">
            <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20"
                 xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"></path>
            </svg>
            <span class="w-full ml-1 text-sm font-medium text-gray-500 md:ml-2
             dark:text-gray-400 hover:drop-shadow truncate">
              {article.title}
            </span>
          </div>
        </li>
      </ol>
    </nav>
  </div>
</div>

<div in:fade class="flex flex-col justify-between fixed w-full" style="height: calc(100% - 62px);">
  {#if !mobileInputMode}
    <div bind:this={generalScrollView}
         class="mt-4 p-4 space-y-4 overflow-y-scroll flex-grow overflow-x-hidden">

      {#if typeof article.pub === 'boolean' && !article.pub}
        <div>
          <p class="text-sm text-red-600 text-center">
            경고: 이 게시물은 삭제된 상태입니다.
          </p>
          <p class="text-sm text-red-600 text-center">
            현재 관리자 계정으로 삭제된 게시물을 열람하고 있습니다.
          </p>
        </div>
      {/if}

      <Article {article} {contents} {users} isAdult="{Object.keys(article.tags??{}).includes('성인')}" />

      {#if Object.keys(article.tags).find(tag => tag.startsWith('연재:'))}
        <div class="w-11/12 sm:w-5/6 md:w-4/5 lg:w-3/5 mx-auto">
          <div class="w-full p-4 rounded-md shadow-md">
            <h1 class="text-2xl">지금 보는 {article.author.id}님의 연재작의 다른 연재분</h1>
            <ol class="divide-y divide-dotted divide-zinc-400">
              {#each article.serials as serial}
                <li class="hover:bg-zinc-100 dark:hover:bg-gray-500 transition-colors">
                  <a class="underline decoration-sky-400 decoration-dashed" class:text-bold={article._key === serial._key} href="/community/{article.board}/{serial._key}">
                    <p class="px-4 py-2">
                      {serial.title}
                      {#if article._key === serial._key}(지금 보는 중){/if}
                    </p>
                  </a>
                </li>
              {/each}
            </ol>
          </div>
        </div>
      {/if}

      <div class="w-11/12 sm:w-5/6 md:w-4/5 lg:w-3/5 mx-auto"> <!-- 댓글 -->
        {#if selectedComment}
          <Comment comment="{selectedComment}"
                   article="{article._key}"
                   allComments="{comments}"
                   myVote="{selectedComment.myVote}"
                   isReplyMode="{true}"
                   {users} />

          <p class="hidden sm:block mt-8 text-zinc-500 text-lg text-center select-none cursor-default">
            댓글 입력창에서 <i class="pr-0.5">Esc</i>를 눌러 답글 작성 모드 취소
          </p>
          <div class="block mt-8 text-zinc-500 text-lg select-none cursor-default flex justify-center">
            <button on:click={disableReplyMode} class="text-red-600">닫기</button>
          </div>

        {:else}

          {#if !isEmpty(bestComments)}
            <div class="mb-6">
              <h3 class="ml-2 mb-2 text-zinc-500">
                댓글 베스트
              </h3>
              <ul class="space-y-3">
                {#each bestComments as comment}
                  <li id="best-c{comment._key}" in:fade class="relative">
                    <Comment board="{article.board}"
                             article="{article._key}"
                             on:delete={() => deleteComment(comment)}
                             bind:allComments="{comments}"
                             bind:users="{users}"
                             selected="{selectedComment?._key === comment._key}"
                             {comment} isBest="{true}" />
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <ul class="space-y-3">

            {#each noRelativeComments as comment}
              <li id="c{comment._key}" in:fade class="relative">
                <Comment board="{article.board}"
                         article="{article._key}"
                         on:delete={() => deleteComment(comment)}
                         bind:allComments="{comments}"
                         bind:users="{users}"
                         selected="{selectedComment?._key === comment._key}"
                         {comment} />
              </li>
            {/each}

          </ul>

          <p class="mt-4 text-zinc-500 text-lg text-center select-none cursor-default">
            {#if isEmpty(comments)}
              댓글이 없어요...
            {:else}
              끝
            {/if}
          </p>

        {/if}
      </div>
    </div>
  {:else}

    <div bind:this={mobileCommentInputModeScrollView}
         class="mt-6 p-2 overflow-x-hidden overflow-y-scroll">
      <h2 class="text-xl mb-2">댓글 작성 중...</h2>

      {#if selectedComment}
        <Comment comment="{selectedComment}"
                 article="{article._key}"
                 myVote="{selectedComment.myVote}"
                 hideToolbar="{true}"
                 isReplyMode="{true}"
                 allComments="{comments}"
                 board="{article.board}"
                 {users} />
      {/if}

      <CommentInput {commenting} {users}
                    bind:commentFolding={commentFolding}
                    bind:selectedComment={selectedComment}
                    iosMode="{true}"
                    on:submit={addComment}
                    on:cancelimageupload={cancelImageUpload}
                    on:togglefold={toggleCommentFold}
                    on:openimageeditor={openImageEditor}
                    on:blur={disableMobileInput}
                    on:favoriteclick={commentFavoriteImageSelected}
                    on:selectfile={() => fileUploader.click()}
                    bind:commentImageUploadSrc={commentImageUploadSrc}
                    bind:smallImage="{image100x100}"
                    bind:content={commentContent}
                    bind:mobileTextInput={mobileTextInput} />

    </div>



  {/if}
  {#if !mobileInputMode}
    <div class="relative w-11/12 sm:w-5/6 md:w-4/5 lg:w-3/5 mx-auto">
      <div id="__simple-navigator" class="absolute left-[-0.5rem] sm:left-[-1.5rem]" style="bottom: {$session.user ? '9' : '2'}rem;">
        <ul class="space-y-2">
          <li>
            <!-- todo: add page parameter -->
            <button on:click={goBack}
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

      {#if $session.user}
        <CommentInput {commenting} {users}
                      bind:commentFolding={commentFolding}
                      bind:selectedComment={selectedComment}
                      on:submit={addComment}
                      on:cancelimageupload={cancelImageUpload}
                      on:togglefold={toggleCommentFold}
                      on:openimageeditor={openImageEditor}
                      on:blur={onBlurGeneralCommentInput}
                      on:favoriteclick={commentFavoriteImageSelected}
                      on:mobilemode={enableMobileInput}
                      on:selectfile={() => fileUploader.click()}
                      bind:commentImageUploadSrc={commentImageUploadSrc}
                      bind:smallImage="{image100x100}"
                      bind:content={commentContent}
                      bind:textInput={commentTextInput} />
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
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

    :target::before {
      content: '';
      display: block;
      height:      10rem;
      margin-top: -10rem;
    }
  }
</style>
