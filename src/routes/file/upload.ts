import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';


export async function post({request}: RequestEvent): Promise<RequestHandlerOutput> {
  const data = await request.formData();
  const file = data.get('file') as File;
  console.log(file);
  return {
    status: 201,
  }
}