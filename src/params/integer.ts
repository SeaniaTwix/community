/** @type {import('@sveltejs/kit').ParamMatcher} */
import {isStringInteger} from '../lib/util';

export function match(param: string) {
  return isStringInteger(param);
}