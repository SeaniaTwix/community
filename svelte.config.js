import adapter from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';
import path from 'node:path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess({
    postcss: true,
  }),

  kit: {
    adapter: adapter({
      out: './build',
      precompress: true,
    }),
    alias: {
      '@root': path.resolve('./src'),
      '@routes': path.resolve('./src/routes'),
      '@static': path.resolve('./static'),
    },
  },
};

export default config;
