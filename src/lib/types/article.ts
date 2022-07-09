import type {IArangoDocumentIdentifier} from '$lib/database';
import type {ArticleDto} from './dto/article.dto';
import type {ITag} from './tag';

export interface IArticle<TagType = Record<string, Record<string, ITag>>> extends ArticleDto<TagType>, IArangoDocumentIdentifier {
  board: string; // board id
  locked: boolean;
  pub: boolean;
  myTags: ITag[];
}