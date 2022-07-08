import {Client} from 'minio';

export class S3 {
  private static minio: Client;

  static upload(name: string, buffer: Buffer): Promise<UploadedObjectInfo> {
    return new Promise((resolve, reject) => {
      if (!S3.minio) {
        S3.minio = new Client( {
          accessKey: process.env.S3_ACCESS_KEY!,
          secretKey: process.env.S3_SECRET_KEY!,
          endPoint: process.env.S3_ENDPOINT!,
          useSSL: true,
        });
      }

      S3.minio.putObject('s3.ru.hn', name, buffer, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    })
  }
}

export interface UploadedObjectInfo {
  etag: string;
  versionId: string | null;
}