import type {ServerLoadEvent} from '@sveltejs/kit';
import type {LoadEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import type {ArticleItemDto} from '$lib/types/dto/article-item.dto';
import type {PageData} from '@routes/community/[id=integer]/best/$types';
import {Board} from '$lib/community/board/server';
import {GET} from '../api/list/+server';
import {error} from '$lib/kit';

function initAutoTag(articleItem: ArticleItemDto): ArticleItemDto {
  const autoTag = /^[[(]?([a-zA-Z가-힣@]+?)[\])].+/gm;
  const regx = autoTag.exec(articleItem.title?.trim() ?? '');
  // console.log(item.title, regx);
  if (regx) {
    articleItem.autoTag = regx[1];
  }
  return articleItem;
}

export async function load({params, url, locals}: ServerLoadEvent): Promise<PageData> {
  const board = new Board(params.id!);

  if (!await board.exists) {
    throw error(HttpStatus.NOT_FOUND, '없는 게시판입니다.');
  }

  const bests = await GET({params, url, locals} as any, true);
  const data = await bests.json();

  // const bestR = await fetch(`${url.pathname}/api/best`);
  // const {bests} = await bestR.json() as { bests: ArticleItemDto[], };
  /*
  const authors = list.map(a => a.author).join(',');
  const authorsInfoRequests = await fetch(`/user/profile/api/detail?ids=${authors}`);
  const users = {};
  if (authorsInfoRequests.ok) {
    const authorInfos = await authorsInfoRequests.json() as {users: IUser[]};
    for (const user of authorInfos.users) {
      users[user._key] = user;
    }
  }*/

  data.articles = data.articles.map(initAutoTag);

  return {
    boardName: await board.name,
    ...data,
  };
}
