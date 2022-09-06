import type {IPublicNotify} from '$lib/types/notify';

interface PageDataInternal {
  list: IPublicNotify[]
}

export type PageData = PageDataInternal;