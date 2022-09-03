import type {ArticleItemDto} from '$lib/types/dto/article-item.dto';

interface PageDataInternal {
  readonly articles: ArticleItemDto[];
  readonly boardName: string;
  readonly currentPage: number;
  readonly maxPage: number;

}

export type PageData = PageDataInternal;