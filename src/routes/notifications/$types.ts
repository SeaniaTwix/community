import type {IPublicNotify} from '$lib/types/notify';
import type {PageData as DefaultData} from '$lib/types/$types';

interface PageDataInternal extends DefaultData {
  list: IPublicNotify[];
}

export type PageData = PageDataInternal;