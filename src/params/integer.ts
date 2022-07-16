/** @type {import('@sveltejs/kit').ParamMatcher} */
import {isStringInteger} from '$lib/util';

export function match(param: string) {
  // console.log('match:', param);
  return isStringInteger(param);
}