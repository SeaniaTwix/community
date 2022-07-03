import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';

export async function post({request}: RequestEvent): Promise<RequestHandlerOutput> {
  const data = await request.formData();

  return {
    status: 201,
  }
}