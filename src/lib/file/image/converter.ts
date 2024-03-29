import {S3} from '$lib/file/s3';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {extname} from 'node:path';
import got from 'got';

const s3Url = `https://${process.env.S3_ENDPOINT}`;
const PngSignature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

export class ImageConverter {
  static getBasePath(_url: string) {
    let url = _url;
    if (url.startsWith(s3Url)) {
      url = url.replace(new RegExp(`^${s3Url}`), '');
    }
    return url.replace(new RegExp(`${extname(url)}$`), '');
  }

  static async saveAll(originalSrc: string, doNotInsert: boolean): Promise<boolean> {
    //const allConverted = await ImageConverter.all(tempFilePath);

    if (!originalSrc.startsWith(s3Url)) {
      originalSrc = `${s3Url}${originalSrc}`;
    }
    const info = await got.head(originalSrc);
    let mime = info.headers['content-type'] ?? 'image/png';
    const src = originalSrc.replace(new RegExp(`^${s3Url}`), '');

    // console.log('mime:', mime);

    if (mime === 'application/octet-stream') {
      const s = got.stream(originalSrc);
      // check png signature
      const data = new Promise<string>((resolve) => {
        s.on('readable', () => {
          let bytes = '';
          while (null !== (bytes += s.read(1))) {
            if (bytes.length >= 8) {
              return resolve(bytes);
            }
          }
        });
      });
      // console.log('data:', await data);
      if (!data) {
        return false;
      } else if (Buffer.compare(Buffer.from(await data), PngSignature)) {
        mime = 'image/png';
      } else {
        return false;
      }
    }

    if (!mime.startsWith('image/')) {
      return false;
    }

    try {
      if (!doNotInsert) {
        await db.query(aql`insert {src: ${this.getBasePath(src)}, converted: []} into images`);
      }
    } catch (e) {
      console.error(e);
    }

    const all = ImageConverter.all(src, mime);

    for (const ext in all) {
      await all[ext];
    }

    return true;
  }

  static all(relativeSrc: string, mime: string) {
    const converter = new ImageConverter;

    const result: Record<string, Promise<unknown>> = {
      jxl: converter.jxl(relativeSrc),
      avif: converter.avif(relativeSrc),
      webp: converter.webp(relativeSrc),
      png: converter.png(relativeSrc),
    };

    if (mime === 'image/jxl') {
      delete result.jxl;
    } else if (mime === 'image/avif') {
      delete result.avif;
    } else if (mime === 'image/webp') {
      delete result.webp;
    } else if (mime === 'image/png') {
      delete result.png;
    }

    return result;
  }

  private request(src: string, ext: string) {
    return new Promise((resolve, reject) => {
      console.log('requesting ', ext);
      got.post(`https://${process.env.EICO_ENDPOINT}/convert/${ext}`, {
        json: {
          key: process.env.EICO_KEY ?? 'test',
          src,
        },
      }).then(resolve).catch(reject);
    });
  }

  jxl(src: string) {
    return this.request(src, 'jxl');
  }

  avif(src: string) {
    return this.request(src, 'avif');
  }

  webp(src: string) {
    return this.request(src, 'webp');
  }

  png(src: string) {
    return this.request(src, 'png');
  }
}
