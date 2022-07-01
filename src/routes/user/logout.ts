import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import {dayjs} from 'dayjs';

export async function post(): Promise<RequestHandlerOutput> {
  return {
    status: 201,
    headers: newLogoutHeader(),
  }
}

function newLogoutHeader() {
  // const expire = addMinutes(new Date(), 15).toUTCString();
  const expire = dayjs().toDate().toUTCString();
  // const expireRefresh = addDays(new Date(), 1).toUTCString();
  const expireRefresh = dayjs().toDate().toUTCString();

  const headers = new Headers();
  headers.append('Set-Cookie',
    `token=; Path=/; Expires=${expire}; SameSite=Strict; HttpOnly;`);
  headers.append('Set-Cookie',
    `refresh=; Path=/; Expires=${expireRefresh}; SameSite=Strict; HttpOnly;`);

  return headers;
}