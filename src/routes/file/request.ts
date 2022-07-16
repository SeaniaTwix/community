import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import aws from 'aws-sdk';
import {nanoid} from 'nanoid';
import type {PresignedPost} from 'aws-sdk/lib/s3/presigned_post';

const S3 = aws.S3;

const s3 = new S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.BUCKET_REGION,
  signatureVersion: 'v4',
  endpoint: process.env.S3_ENDPOINT,
});

export async function POST({locals, url}: RequestEvent): Promise<RequestHandlerOutput> {
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
  const prefix = `uu/${locals.user.uid}/${randomId}/`; // .${type.split('/')[1]}`;

  const s3Params: PresignedPost.Params = {
    Bucket: process.env.BUCKET_NAME,
    Conditions: [
      ['content-length-range', 1048, 10485760],
      ['starts-with', '$key', prefix],
      // ['starts-with', '$bucket', ''],
      // ['starts-with', '$Content-Type', 'video/webm'],
      {'x-amz-algorithm': 'AWS4-HMAC-SHA256'},
      // {'x-amz-server-side-encryption': 'AES256'},
      {'acl': 'public-read'},
    ],
    // Key: key,
    Expires: 120,
    // ContentType: type,
  };

  if (type.startsWith('video')) {
    s3Params.Conditions!.push(['starts-with', '$Content-Type', 'video/webm']);
  } else {
    s3Params.Conditions!.push(['starts-with', '$Content-Type', 'image/']);
  }

  // const uploadUrl = await s3.getSignedUrlPromise('putObject', s3Params);
  const presigned = s3.createPresignedPost(s3Params);
  console.log(presigned);

  // ru.hn only
  /*
  if (s3Params.Bucket === 'uu') {
    key = `uu/${key}`;
  }*/

  return {
    status: HttpStatus.CREATED,
    body: {
      // uploadUrl,
      bucket: process.env.BUCKET_NAME,
      prefix,
      presigned,
    } as any,
  };
}

