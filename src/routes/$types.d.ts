import type * as Kit from '@sveltejs/kit';
import type {IUserSession} from '@root/app';

interface PageDataInternal {
  user: IUserSession;
  boards: {
    _key: string;
    name: string;
  }[];
}

export type PageData = PageDataInternal;
export type LayoutOutput = Kit.LayoutOutput<PageDataInternal>;