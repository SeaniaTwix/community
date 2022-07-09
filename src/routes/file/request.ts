import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import aws from 'aws-sdk';
import {nanoid} from 'nanoid';

const S3 = aws.S3;

const s3 = new S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.BUCKET_REGION,
  signatureVersion: 'v4',
  endpoint: process.env.S3_ENDPOINT,
});

export async function post({locals, url}: RequestEvent): Promise<RequestHandlerOutput> {
  const type = url.searchParams.get('type');
  if (!type) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: 'type is require',
      },
    };
  }

  if (!locals.user) {
    return {
      status: HttpStatus.UNAUTHORIZED,
      body: {
        reason: 'please login and try again',
      },
    };
  }

  const randomId = nanoid(32);
  let key = `${locals.user.uid}/${randomId}.${type.split('/')[1]}`;

  const s3Params = {
    Bucket: process.env.BUCKET_NAME,
    Key: key,
    Expires: 180,
    ContentType: type,
  };

  const uploadUrl = await s3.getSignedUrlPromise('putObject', s3Params);

  // ru.hn only
  if (s3Params.Bucket === 'uu') {
    key = `uu/${key}`;
  }

  return {
    status: HttpStatus.CREATED,
    body: {
      uploadUrl,
      key,
    },
  };
}

