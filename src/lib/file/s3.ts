import aws from 'aws-sdk';
import type {PresignedPost} from 'aws-sdk/lib/s3/presigned_post';
import * as process from 'process';

const _S3 = aws.S3;

const s3 = new _S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.BUCKET_REGION,
  signatureVersion: 'v4',
  endpoint: process.env.S3_ENDPOINT,
});

export class S3 {
  static upload(name: string, buffer: Buffer) {
    let Bucket: string, Key: string;

    if (process.env?.S3_ENDPOINT === 's3.ru.hn') {
      Bucket = 'uu';
      Key = name.replace(/^\/uu\//, '');
    } else {
      Bucket = process.env.BUCKET_NAME;
      Key = name;
    }

    return s3.upload({
      Bucket,
      Key,
      ACL: 'public-read',
      Body: buffer,
    }).promise();
  }

  static newUploadLink(prefix: string, type: string) {
    const s3Params: PresignedPost.Params = {
      Bucket: process.env.BUCKET_NAME,
      Conditions: [
        ['content-length-range', 1048, 10485760],
        ['starts-with', '$key', prefix],
        {'x-amz-algorithm': 'AWS4-HMAC-SHA256'},
        {'acl': 'public-read'},
      ],
      Expires: 120,
    };

    if (type === 'video/webm' || type === 'video/mp4') {
      s3Params.Conditions!.push(['starts-with', '$Content-Type', type]);
    } else {
      s3Params.Conditions!.push(['starts-with', '$Content-Type', 'image/']);
    }

    return s3.createPresignedPost(s3Params);
  }

  static newAvatarUploadLink(uid: string) {
    const prefix = `avatar/${uid}.`;
    const s3Params: PresignedPost.Params = {
      Bucket: process.env.BUCKET_NAME,
      Conditions: [
        ['content-length-range', 1048, 3145728],
        ['starts-with', '$key', prefix],
        {'x-amz-algorithm': 'AWS4-HMAC-SHA256'},
        ['starts-with', '$Content-Type', 'image/'],
        {'acl': 'public-read'},
      ],
      Expires: 30,
    };

    return {
      presigned: s3.createPresignedPost(s3Params),
      prefix,
    }
  }
}
