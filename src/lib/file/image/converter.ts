import magic from 'magic-bytes.js';
import {TmpDir} from 'temp-file';
import fs, {closeSync, openSync, readSync, readFileSync} from 'node:fs';
import {execSync} from 'node:child_process';
import sharp from 'sharp';
import WebP from 'node-webpmux';
import isAnimated from 'is-animated';
import {S3} from '$lib/file/s3';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {extname} from 'node:path';
import {isEmpty} from 'lodash-es';


export class ImageConverter {
  static getBasePath(s3Url: string, srcFullPath: string, tempFilePath?: string) {
    const ext = getExtension(srcFullPath, tempFilePath);
    const basePathParser = new RegExp(`^${s3Url}(.+)(?:${ext}$)`);
    const basePath = basePathParser.exec(srcFullPath);
    return basePath ? basePath[1] : srcFullPath;
  }

  static async saveAll(s3Url: string, srcFullPath: string, tempFilePath: string) {
    const allConverted = await ImageConverter.all(tempFilePath);

    const base = this.getBasePath(s3Url, srcFullPath, tempFilePath);
    const ext = extname(srcFullPath);

    const uploaded = await Promise.all(
      Object.keys(allConverted)
        .filter(e => !!allConverted[e] && ext !== `.${e}`)
        .map(async (convertedExt) => {
          return await S3.upload(`${base}.${convertedExt}`, await allConverted[convertedExt]);
        }),
    );

    try {
      const links = uploaded.map(u => u.Location);
      db.query(aql`insert {src: ${base}, converted: ${links}} into images`)
        .then()
        .catch((e) => console.error(e));
    } catch (e) {
      console.error(e);
    }

  }

  static checkType(path: string, length = 64) {
    const file = openSync(path);
    const buf = Buffer.alloc(length);
    readSync(file, buf, 0, length, 0);
    const guessed = magic(buf);
    closeSync(file);
    return guessed;
  }

  static async all(path: string) {
    const guessed = this.checkType(path);

    let isWebp = false;
    let isPng = false;
    let isAvif = false;
    let isJxl = false;
    if (guessed.length > 0) {
      const g = guessed[0];
      isWebp = g.extension === 'webp';
      isPng = g.extension === 'png';
      isJxl = g.extension === 'jxl';
      isAvif = g.extension === 'avif';
    }

    const image = readFileSync(path);

    const converter = new ImageConverter;

    let png: Promise<Buffer>;

    if (isWebp) {
      png = wrapper(await converter.png(image));
    } else if (isPng) {
      png = wrapper(image);
    } else {
      png = converter.png(image);
    }

    function wrapper(buf: Buffer): Promise<Buffer> {
      return new Promise(resolve => resolve(buf));
    }

    const result: Record<string, Promise<Buffer>> = {
      jxl: isJxl ? wrapper(image) : converter.jxl(isWebp ? await png : image),
      avif: isAvif ? wrapper(image) : converter.avif(image),
      webp: isWebp ? wrapper(image) : converter.webp(image),
      png,
    }

    const promises = Object.values(result);
    await Promise.all(promises);

    for (const ext in result) {
      result[ext] = await result[ext];
    }

    return result;
  }

  async jxl(input: Buffer): Promise<Buffer | null> {
    const guessed = magic(input);
    let ext: string | undefined;
    if (guessed.length > 0) {
      const guess = magic(input)[0];
      ext = guess.extension ?? 'png';
    }

    // todo: reduce conversion stack
    if (!ext || !['png', 'gif', 'jpeg', 'jpg'].includes(ext)) {
      input = (await this.png(input))!;
    }

    const tmp = new TmpDir();
    const tmpFile = await tmp.getTempFile({suffix: `.${ext}`});
    fs.writeFileSync(tmpFile, input);
    const tmpJxl = await tmp.getTempFile({suffix: '.jxl'});

    try {
      const command = `cjxl ${tmpFile} ${tmpJxl}`;
      execSync(command);
      return fs.readFileSync(tmpJxl);
    } catch {
      return null;
    } finally {
      tmp.cleanup().then();
    }
  }

  async avif(input: Buffer, lossless = false): Promise<Buffer | null> {
    const tmp = new TmpDir();

    try {
      if (isAnimated(input)) {
        const ext = magic(input)[0].extension;
        if (ext === 'gif') {
          const tmpGif = await tmp.getTempFile({suffix: `.${ext}`});
          fs.writeFileSync(tmpGif, input);
          const tmpY4m = await tmp.getTempFile({suffix: '.y4m'});
          execSync(`ffmpeg -hide_banner -i ${tmpGif} -pix_fmt yuv420p -y ${tmpY4m}`);

          const tmpAvif = await tmp.getTempFile({suffix: '.avif'});
          execSync(`avifenc ${tmpY4m} ${tmpAvif}`);

          return fs.readFileSync(tmpAvif);
        }
      }
      return await sharp(input).avif({lossless}).toBuffer();
    } catch (e) {
      return null;
    } finally {
      tmp.cleanup().then();
    }
  }

  async dwebp(input: Buffer) {
    const image = new WebP.Image();
    await image.load(input)
    console.log(input, image)
    // image.convertToAnim()
    // const tmp = new TmpDir
    // const tmpDir = await tmp.getTempDir()
    return await image.demux({ buffers: true })
  }

  async webp(input: Buffer): Promise<Buffer | null> {
    try {
      return await sharp(input, {animated: isAnimated(input)})
        .webp({smartSubsample: true})
        .toBuffer()
    } catch (e) {
      console.trace(e);
      return null
    }
  }

  async png(input: Buffer): Promise<Buffer | null> {
    try {
      return await sharp(input, {animated: isAnimated(input)}).png().toBuffer()
    } catch {
      return null
    }
  }
}

function getExtension(path: string, filePath?: string) {
  const ext = extname(path);
  if (ext.length <= 1 && filePath) {
    const guessed = ImageConverter.checkType(filePath);
    if (!isEmpty(guessed)) {
      return guessed[0].extension;
    }
  }
  return ext;
}