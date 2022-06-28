import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import type {JSONObject} from '@sveltejs/kit/types/private';

export async function post({request}: RequestEvent): Promise<RequestHandlerOutput> {
  const login = new LoginRequest(await request.json());
  return {
    status: login.status,
  };
}

class LoginRequest {
  constructor(body: Rec<string>) {

  }

  get status(): number {
    return 200;
  }
}