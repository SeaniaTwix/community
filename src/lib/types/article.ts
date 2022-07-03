import type {IArangoDocumentIdentifier} from '$lib/database';
import type {ArticleDto} from './dto/article.dto';

export interface IArticle extends ArticleDto, IArangoDocumentIdentifier {
  board: string; // board id
  locked: boolean;
  pub: boolean;
}