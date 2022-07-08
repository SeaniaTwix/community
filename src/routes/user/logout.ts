import type {RequestHandlerOutput} from '@sveltejs/kit';
import {dayjs} from 'dayjs';

export async function post(): Promise<RequestHandlerOutput> {
  return {
    status: 201,
    headers: newLogoutHeader(),
  }
}

function newLogoutHeader() {
  const rightNow = dayjs().toDate().toUTCString();

  const headers = new Headers();
  headers.append('Set-Cookie',
    `token=; Path=/; Expires=${rightNow}; SameSite=Strict; HttpOnly;`);
  headers.append('Set-Cookie',
    `refresh=; Path=/; Expires=${rightNow}; SameSite=Strict; HttpOnly;`);

  return headers;
}