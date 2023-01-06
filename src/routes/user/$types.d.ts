import type {PageData as RootPageData} from '$lib/types/$types';

export interface PageData extends RootPageData {
  isAdult: boolean;
}