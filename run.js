import polka from 'polka';
import {handler} from './build/handler';

const server = polka();

server
  .use(handler)
  .listen(process?.env?.PORT ?? 3000)