import ky from 'ky-universal';

export function upload(file: File | Blob, _type?: string, _name?: string) {
  return new Promise<string>(async (resolve, reject) => {
    try {
      // const file = blobInfo.blob();
      const type = file?.type ?? (_type ?? 'image/png');
      const request = await ky.post(`/file/request?type=${type}`)
        .json<IUploadRequestResult>();
      const body = new FormData();
      const n = (<File>file)?.name ?? (_name ?? `UZ-is-Kawaii.${type.split('/')[1]}`);
      body.set('key', request.prefix + n);
      body.set('acl', 'public-read');
      body.set('Content-Type', type);
      // body.set('bucket', request.bucket);
      for (const key of Object.keys(request.presigned.fields)) {
        body.set(key, request.presigned.fields[key]);
      }
      body.append('file', file);
      await ky.post('https://s3.ru.hn', {
        body,
        timeout: false,
      });
      const uploadedUrl = `https://s3.ru.hn/${request.prefix + n ?? `UZ-is-Kawaii.${type.split('/')[1]}`}`;
      resolve(uploadedUrl);

      ky.post('/file/complete', {
        json: {
          src: uploadedUrl,
        },
        // timeout: false,
      }).then();
    } catch (e) {
      reject(e);
    }
  });
}

interface IUploadRequestResult {
  prefix: string;
  bucket: string;
  presigned: {
    url: string,
    fields: Record<string, string>
  };
}