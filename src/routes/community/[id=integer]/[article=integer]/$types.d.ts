import {IArticle} from '$lib/types/article';
import type {IComment} from '$lib/types/comment';

interface PageDataInternal extends Partial<IArticle<Record<string, number>>> {
  author: { name: string };
  tags: Record<string, number>;
  serials: string[];
  boardName: string;
  comments: IComment[];
}

export type PageData = PageDataInternal;