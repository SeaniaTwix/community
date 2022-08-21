import { error } from '@sveltejs/kit';
import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {ArticleItemDto} from '$lib/types/dto/article-item.dto';

function initAutoTag(articleItem: ArticleItemDto): ArticleItemDto {
  const autoTag = /^[[(]?([a-zA-Z가-힣@]+?)[\])].+/gm;
  const regx = autoTag.exec(articleItem.title?.trim() ?? '');
  // console.log(item.title, regx);
  if (regx) {
    articleItem.autoTag = regx[1];
  }
  return articleItem;
}

export async function load({params, url, fetch, session}: LoadEvent): Promise<LoadOutput> {
  const nr = await fetch(`/community/${params.id}/api/info`);
  const {name} = await nr.json();
  if (!name) {
    throw error(500, '없는 게시판입니다.');
  }
  const page = url.searchParams.get('page') ?? '1';
  const res = await fetch(`/community/${params.id}/api/list?type=best&page=${page}`);
  const {list, maxPage} = await res.json() as { list: ArticleItemDto[], maxPage: number };
  if (parseInt(page) > maxPage) {
    throw error(500, 'Not found');
  }
  const id = params.id;
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

  return {
  articles: list.map(initAutoTag),
  id,
  params,
  name,
  // users,
  currentPage: parseInt(page),
  maxPage,
  // bests,
  ui: session.ui,
};
}
