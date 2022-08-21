import { error } from '@sveltejs/kit';
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
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
    return {
      status: res.status,
      error: reason,
    }
  }
  const {article} = await res.json() as ArticleDto;
  if (!article) {
    throw error(500, '게시글을 찾을 수 없습니다.');
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
  article,
  contents,
  boardName: name,
  // author: user,
  comments,
  users: userInfo,
  mainImage,
};
}
