/* eslint-disable @typescript-eslint/ban-ts-comment */
import magic from 'magic-bytes.js';
import {TmpDir} from 'temp-file';
import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';
import sharp from 'sharp';
// @ts-ignore
import WebP from 'node-webpmux';
// @ts-ignore
import * as isAnimated from 'is-animated';


export class ImageConverter {
  static async processing(images: Record<string, Promise<unknown>>, key: string, prefix: string) {
    const extensions = Object.keys(images);
    const imageProcessed = await Promise.all(Object.values(images));
    const imgs = imageProcessed
      .map((buf, i) => ({buf, ext: extensions[i]}));
    // await Promise.all(images.map(v => ))
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
      const cur = path.resolve('.');
      const command = `node ${cur}/node_modules/jxl-wasm/lib/cjxl-wrap.js ${tmpFile} ${tmpJxl}`;
      execSync(command);
      return fs.readFileSync(tmpJxl);
    } catch {
      return null;
    } finally {
      tmp.cleanup().then();
    }
  }

  async avif(input: Buffer, lossless = true): Promise<Buffer | null> {
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
    } catch {
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
    } catch {
      return null
    }
  }

  async png(input: Buffer): Promise<Buffer | null> {
    try {
      return await sharp(input).png().toBuffer()
    } catch {
      return null
    }
  }
}