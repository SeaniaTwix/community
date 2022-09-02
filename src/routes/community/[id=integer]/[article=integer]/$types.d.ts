import {IArticle} from '$lib/types/article';

interface PageDataInternal extends Partial<IArticle<Record<string, number>>> {
  author: { name: string };
  tags: Record<string, number>;
  serials: string[];
  boardName: string;
}

export type PageData = PageDataInternal;