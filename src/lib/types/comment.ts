import type {IArangoDocumentIdentifier} from '$lib/database';
import type {CommentDto, PublicVoteType} from './dto/comment.dto';

export interface IComment<AuthorType = string, VoteType = PublicVoteType> extends IArangoDocumentIdentifier, CommentDto<VoteType> {

  // user id
  author: AuthorType;

  createdAt: Date;
}