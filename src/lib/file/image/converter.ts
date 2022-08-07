import {S3} from '$lib/file/s3';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {extname} from 'node:path';
import got from 'got';

const s3Url = `https://${process.env.S3_ENDPOINT}`;

export class ImageConverter {
  static getBasePath(_url: string) {
    let url = _url;
    if (url.startsWith(s3Url)) {
      url = url.replace(new RegExp(`^${s3Url}`), '');
    }
    return url.replace(new RegExp(`${extname(url)}$`), '');
  }

  static async saveAll(originalSrc: string): Promise<boolean> {
    //const allConverted = await ImageConverter.all(tempFilePath);

    let src: string;
    let mime: string;
    if (originalSrc.startsWith(s3Url)) {
      const info = await got.head(originalSrc);
      mime = info.headers['content-type'] ?? 'image/png';
      src = originalSrc.replace(new RegExp(`^${s3Url}`), '');
    } else {
      const info = await got.head(`${s3Url}${originalSrc}`);
      mime = info.headers['content-type'] ?? 'image/png';
      src = originalSrc;
    }

    if (!mime.startsWith('image/')) {
      return false;
    }

    await ImageConverter.all(src, mime);

    try {
      db.query(aql`insert {src: ${this.getBasePath(src)}, converted: []} into images`)
        .then()
        .catch((e) => console.error(e));
    } catch (e) {
      console.error(e);
    }

    return true;
  }

  static all(relativeSrc: string, mime: string) {
    const converter = new ImageConverter;

    const converts = {
      jxl: mime === 'image/jxl' ? undefined : converter.jxl(relativeSrc),
      avif: mime === 'image/avif' ? undefined : converter.avif(relativeSrc),
      webp: mime === 'image/webp' ? undefined : converter.webp(relativeSrc),
      png: mime === 'image/png' ? undefined : converter.png(relativeSrc),
    };

    return Promise.allSettled(Object.values(converts).filter(value => !!value));
  }

  async jxl(src: string) {
    await got.post(`https://${process.env.EICO_ENDPOINT}/convert/jxl`, {
      json: {
        key: process.env.EICO_KEY ?? 'test',
        src,
      },
    });
  }

  async avif(src: string) {
    await got.post(`https://${process.env.EICO_ENDPOINT}/convert/avif`, {
      json: {
        key: process.env.EICO_KEY ?? 'test',
        src,
      }
    });
  }

  async webp(src: string) {
    await got.post(`https://${process.env.EICO_ENDPOINT}/convert/webp`, {
      json: {
        key: process.env.EICO_KEY ?? 'test',
        src,
      }
    });
  }

  async png(src: string) {
    await got.post(`https://${process.env.EICO_ENDPOINT}/convert/png`, {
      json: {
        key: process.env.EICO_KEY ?? 'test',
        src,
      }
    });
  }
}
