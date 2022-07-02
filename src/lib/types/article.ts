import type {IArangoDocumentIdentifier} from '$lib/database';
import type {ArticleDto} from './dto/article.dto';

export interface IArticle extends ArticleDto, IArangoDocumentIdentifier {
  // title: string;
  // content: string;
  // author: string; // uid
  comments: string[]; // comments ids
  board: string; // board id
  views: number;
  // tags: string[];
}