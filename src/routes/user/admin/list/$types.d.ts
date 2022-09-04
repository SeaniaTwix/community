import type {IUser} from '$lib/types/user';

interface PageDataInternal {
  users: IUser[];
}

export type PageData = PageDataInternal;