import type {IArangoDocumentIdentifier} from '$lib/database';
import type {ArticleDto} from './dto/article.dto';
import type {ITag} from './tag';

// @ts-ignore
export interface IArticle<TagType = Record<string, Record<string, ITag>>, AuthorType = string,> extends ArticleDto<TagType>, IArangoDocumentIdentifier {
  board: string; // board id
  locked: boolean;
  pub: boolean;
  myTags: ITag[];
  author: AuthorType;
}