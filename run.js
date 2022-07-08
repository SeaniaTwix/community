import polka from 'polka';
import {handler} from './build/handler.js';

const server = polka();
const PORT = process?.env?.PORT ?? 3000;

console.log('server started');

server
  .use(handler)
  .listen(PORT)
