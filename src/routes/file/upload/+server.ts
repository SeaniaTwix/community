import { json as json$1 } from '@sveltejs/kit';
import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import got from 'got';
import {createReadStream, createWriteStream} from 'node:fs';
import {basename, extname} from 'node:path';
import {TmpDir} from 'temp-file';
import {S3} from '$lib/file/s3';
import {nanoid} from 'nanoid';
import {isStringInteger} from '$lib/util';
import {ImageConverter} from '$lib/file/image/converter';

export async function POST({request, locals: {user}}: RequestEvent): Promise<RequestHandlerOutput> {
  if (!user) {
    return new Response(undefined, { status: HttpStatus.UNAUTHORIZED });
  }

  const {src} = await request.json() as { src: string };

  const head = await got.head(src);

  if (head.statusCode !== 200) {
    return new Response(undefined, { status: head.statusCode });
  }

  if (head.headers['content-length'] && isStringInteger(head.headers['content-length'])) {
    const contentLength = parseInt(head.headers['content-length']);
    if (contentLength > 10485760) {
      return json$1({
  reason: 'content-length must be less than 10485760'
}, {
        status: HttpStatus.NOT_ACCEPTABLE
      })
    }
  } else {
    return new Response(undefined, { status: HttpStatus.BAD_REQUEST })
  }

  const uploadedLink = await new Promise<string>(async (resolve, reject) => {
    const tmp = new TmpDir('upload-via-external-link');

    const tmpFilePath = await tmp.getTempFile({suffix: extname(src)});
    const fileWrite = createWriteStream(tmpFilePath);

    fileWrite
      .on('finish', async () => {
        try {
          const randomId = nanoid(32);
          const p = `/uu/${user.uid}/${randomId}/${basename(src)}`;
          const rs = createReadStream(tmpFilePath);
          const sendData = await S3.upload(p, rs);

          ImageConverter.saveAll(`https://${process.env.S3_ENDPOINT}${p}`, false).then(() => tmp.cleanup().then());
          resolve(sendData.Location);
        } catch (e) {
          reject(e);
        }
      })
      .once('error', () => {
        reject('error file stream');
        tmp.cleanup();
      });

    got.stream(src).pipe(fileWrite);
  });

  return json$1({
  uploadedLink,
}, {
    status: 201
  });
}