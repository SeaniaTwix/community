import {defaultEditorSettings} from '$lib/editor/settings';

export const uploadAllowedExtensions = defaultEditorSettings.images_file_types
  .split(',')
  .map((ext) => `\\.${ext}`)
  .join('|');

export function toSources(images: string[]) {
  const srcParser = new RegExp(`https://s3.ru.hn/(.+)(${uploadAllowedExtensions})$`);
  return images.map(link => {
    const result = srcParser.exec(link);
    return {
      srcset: link,
      type: result ? `image/${result[2].slice(1)}` : 'image/png',
    }
  });
}