import dayjs from 'dayjs';

export async function POST(): Promise<Response> {
  return new Response(undefined, { status: 201, headers: newLogoutHeader() })
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