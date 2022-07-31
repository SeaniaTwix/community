import {load} from 'cheerio';

export const defaultEditorSettings = {
  language: 'ko_KR',
  plugins: 'image media searchreplace code autolink autosave',
  toolbar: 'uploadImageRu image media | undo redo | blocks | bold italic | alignleft aligncentre alignright alignjustify | indent outdent | bullist numlist | searchreplace code removeformat restoredraft',
  autosave_ask_before_unload: false,
  // images_upload_url: '/file/upload',
  // images_upload_base_path: '/file',
  // images_upload_handler: (blobInfo: IBlobInfo) => imageUpload(blobInfo.blob(), undefined, undefined),
  paste_preprocess: async (plugin: any, args: any) => {
    const $ = load(args.content);
    if ($('img').length > 0) {
      args.content += '<p></p>';
    }
  },
  resize: true,
  min_height: 160,

  content_css: '/editor.css',

  file_picker_types: 'image media',
  images_file_types: 'jpeg,jpg,jpe,jfi,png,gif,webp,avif,jxl,mp4,webm',
};

export const darkThemes = {
  skin: 'oxide-dark',
  content_css: '/editor.dark.css',
};

interface IBlobInfo {
  base64: () => any;
  blob: () => File;
  blobUri: () => any;
  filename: () => any;
  id: () => any;
  name: () => any;
  uri: () => any;
}