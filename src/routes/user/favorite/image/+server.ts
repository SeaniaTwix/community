import {json} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import HttpStatus from 'http-status-codes';
import got from 'got';
import {error} from '$lib/kit';

export async function GET({url, locals: {user}}: RequestEvent): Promise<Response> {
  if (!user) {
    return new Response(undefined, {status: HttpStatus.UNAUTHORIZED});
  }

  const u = await User.findByUniqueId(user.uid);

  if (!u) {
    return new Response(undefined, {status: HttpStatus.UNAUTHORIZED});
  }

  // 이게 존재하면 해당 링크가 저장되어있는지를 검색해야 함.
  const link = (url.searchParams.get('url') ?? '').trim();

  if (link) {
    // todo: test url
    const headCheck = await got.head(link);
    if (!headCheck.ok) {
      return new Response(undefined, {status: HttpStatus.NOT_FOUND});
    }

    const favs = await u.getFavoriteImages();
    const i = Object.values(favs).findIndex(fav => fav.src === link);
    // console.log(favs, i, Object.keys(favs)[i]);

    return json({
      name: i >= 0 ? Object.keys(favs)[i] : null,
    }, {
      status: HttpStatus.OK,
    });
  }

  // 없으면 그냥 해당 계정이 저장한 모든 즐겨찾기 이미지 목록 반환

  /**
   * 반환 값은 Record<string, string>입니다.
   * key 값은 `/`가 포함될 수 있습니다.
   */

  //
  return json({
    favorites: await u.getFavoriteImages(),
  }, {
    status: HttpStatus.OK,
  });
}

export async function POST({request, locals: {user}}: RequestEvent): Promise<Response> {
  if (!user) {
    return new Response(undefined, {status: HttpStatus.UNAUTHORIZED});
  }

  const u = await User.findByUniqueId(user.uid);

  if (!u) {
    return new Response(undefined, {status: HttpStatus.UNAUTHORIZED});
  }

  const {url, name, size} = await request.json() as {
    readonly url: string;
    readonly name: string;
    readonly size: {
      readonly x: number;
      readonly y: number;
    };
  };

  if (typeof url !== 'string' || typeof name !== 'string' || typeof size !== 'object') {
    throw error(HttpStatus.BAD_REQUEST);
  }

  if (!size.y || typeof size.y !== 'number') {
    throw error(HttpStatus.BAD_REQUEST);
  } else if (size.y > 10000) {
    throw error(HttpStatus.BAD_REQUEST);
  }

  try {
    await u.addFavoriteImage(url, name, size);
  } catch (e: any) {
    throw error(HttpStatus.BAD_REQUEST, e.toString());
  }

  return new Response(undefined, {status: HttpStatus.ACCEPTED});
}

export async function DELETE({request}: RequestEvent): Promise<Response> {
  return new Response(undefined, {status: HttpStatus.ACCEPTED});
}


class ImageFavoriteRequest {
  constructor(private readonly user: User) {
  }
}