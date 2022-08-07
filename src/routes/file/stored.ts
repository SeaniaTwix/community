import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {isEmpty} from 'lodash-es';

/**
 * 외부 이미지 변환에서 콜백으로 도착하는 웹 훅의 최종 처리입니다.
 */

export async function POST({request, url: {searchParams}}: RequestEvent): Promise<RequestHandlerOutput> {
  const {key, from, to} = await request.json() as IStoredEventPayload;
  if (key !== process.env.EICO_KEY) {
    return {
      status: HttpStatus.UNAUTHORIZED,
    };
  }

  if (isEmpty(from) || isEmpty(to)) {
    return {
      status: HttpStatus.BAD_REQUEST,
      body: {
        from,
        to,
      },
    };
  }

  if (searchParams.get('failed') === 'yes') {
    // todo: request again
    return {};
  }

  await db.query(aql`
    for image in images
      filter image.src == ${from}
        let converted = is_array(image.converted) ? (
          for link in image.converted
            return link) : []
        update image with {converted: push(converted, ${to}, true)} in images`);

  return {};
}

interface IStoredEventPayload {
  key: string;
  from: string;
  to: string;
}
