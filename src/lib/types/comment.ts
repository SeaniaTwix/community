import type {IArangoDocumentIdentifier} from '$lib/database';
import type {CommentDto} from './dto/comment.dto';

export interface IComment<AuthorType = string> extends IArangoDocumentIdentifier, CommentDto {

  // user id
  author: AuthorType;

  createdAt: Date;
}