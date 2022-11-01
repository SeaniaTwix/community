import type {ServerLoadEvent} from '@sveltejs/kit';

export async function load({locals}: ServerLoadEvent): Promise<any> {
  return {
    user: locals.user
  }
}