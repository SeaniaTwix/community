import type {IArangoDocumentIdentifier} from '$lib/database';
import type {CommentDto} from './dto/comment.dto';

export interface IComment extends IArangoDocumentIdentifier, CommentDto {

  // user id
  author: string;

  createdAt: Date;
}