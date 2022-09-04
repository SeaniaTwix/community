import type {ITag} from '$lib/types/tag';
import type {IUser} from '$lib/types/user';

interface PageDataInternal {
  tags: (ITag & {user: IUser})[];
  author: string;
}

export type PageData = PageDataInternal;