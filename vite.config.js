// vite.config.js
import {sveltekit} from '@sveltejs/kit/vite';
import compression from 'vite-plugin-compression';

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [
    sveltekit(),
    compression({algorithm: 'brotliCompress'})
  ],
};

export default config;