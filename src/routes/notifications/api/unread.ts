import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';

export async function GET({locals}: RequestEvent): Promise<RequestHandlerOutput> {
  return {}
}