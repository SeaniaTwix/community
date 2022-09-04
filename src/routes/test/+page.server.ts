import type {ServerLoadEvent} from '@sveltejs/kit';

export async function load({params, url, locals}: ServerLoadEvent): Promise<Rec<any>> {
  return {
    test:1
  }
}