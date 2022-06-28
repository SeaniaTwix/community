import type {RequestEvent, ResolveOptions} from '@sveltejs/kit';
import type {MaybePromise} from '@sveltejs/kit/types/private';


/** @type {import('@sveltejs/kit').Handle} */
export async function handle({event, resolve}: HandleParameter) {
  const response = await resolve(event);
  return response;
}

interface HandleParameter {
  event: RequestEvent,
  resolve: (event: RequestEvent, opts?: ResolveOptions) => MaybePromise<Response>
}