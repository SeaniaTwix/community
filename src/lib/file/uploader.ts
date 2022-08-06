import ky from 'ky-universal';

export function upload(file: File | Blob, type?: string, name?: string) {
  return new Promise<string>(async (resolve, reject) => {
    try {
      // const file = blobInfo.blob();
      const t = file.type ?? type;
      const request = await ky.post(`/file/request?type=${t}`)
        .json<IUploadRequestResult>();
      const body = new FormData();
      const n = (<File>file).name ?? name;
      body.set('key', request.prefix + n ?? `UZ-is-Kawaii.${t.split('/')[1]}`);
      body.set('acl', 'public-read');
      body.set('Content-Type', file.type ?? type);
      // body.set('bucket', request.bucket);
      for (const key of Object.keys(request.presigned.fields)) {
        body.set(key, request.presigned.fields[key]);
      }
      body.append('file', file);
      await ky.post('https://s3.ru.hn', {
        body,
        timeout: false,
      });
      const uploadedUrl = `https://s3.ru.hn/${request.prefix + n ?? `UZ-is-Kawaii.${t.split('/')[1]}`}`;
      resolve(uploadedUrl);

      ky.post('/file/complete', {
        json: {
          src: uploadedUrl,
        },
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