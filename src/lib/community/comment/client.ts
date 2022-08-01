import {writable} from 'svelte/store';
import {unified} from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import {UrlRegexSafe} from '$lib/url-regex-safe';

export const currentReply = writable<string | undefined>();
export const deletedComment = writable<string | undefined>();
export const highlighed = writable<string | undefined>();
export const imageSrc = writable<FavoriteImage | undefined>();

export type FavoriteImage = {src: string, size: {x: number, y: number}};

export async function sanitize(content: string) {
  const sanitized = await unified()
    .use(rehypeParse, {fragment: true})
    .use(rehypeSanitize, {
      tagNames: [],
    })
    .use(rehypeStringify)
    .process(content ?? '');

  const urlFound = sanitized.value.toString().match(UrlRegexSafe());

  if (urlFound) {
    content = content
      .split('\n')
      .map((line) => {
        return line.split(' ')
          .map((text) => {
            if (urlFound.includes(text)) {
              const protocolExists = /^https?:\/\//.test(text);
              const full = protocolExists ? text : `https://${text}`;
              return `<a class="text-sky-300 hover:text-sky-400 transition-colors select-text" href="${full}">${full}</a>`;
            } else {
              return `<span>${text}</span>`;
            }
          })
          .join(' ');
      }).join('\n');
  }
  return content;
}