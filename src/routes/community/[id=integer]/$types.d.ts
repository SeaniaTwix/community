import type * as Kit from '@sveltejs/kit';
import type {IUserSession} from '@root/app';
import {ArticleItemDto} from '$lib/types/dto/article-item.dto';

interface PageDataInternal {
  user: IUserSession;
  articles: ArticleItemDto[];
  announcements: ArticleItemDto[];
  bests: ArticleItemDto[];
  name: string;
  currentPage: number;
  maxPage: number;
  session: App.Locals;
}

export type PageData = PageDataInternal;