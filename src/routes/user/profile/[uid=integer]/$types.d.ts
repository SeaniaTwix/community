import type {IUserSession} from '@root/app';

interface PageDataInternal {
  user: IUserSession;
}

export type PageData = PageDataInternal;