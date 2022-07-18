/* eslint-disable @typescript-eslint/no-explicit-any,
                  @typescript-eslint/no-empty-function,
                  @typescript-eslint/no-unused-vars*/

import {Entity, SafeType} from 'dto-mapping';

export type InternalVoteType = {
  [userId: string]: {
    createdAt: Date | string, type: 'like' | 'dislike'
  }
};
export type PublicVoteType = {
  like: number;
  dislike: number;
}

@Entity()
export class CommentDto<VoteType = InternalVoteType> {

  constructor(_obj: unknown) {
  }

  // article id (root)
  @SafeType({type: String})
  article?: string;

  @SafeType({type: String})
  // 내용
  content?: string;

  @SafeType({type: Boolean})
  pub: boolean = true;

  // 코멘트용 이미지 (상단 고정. 단일 이미지)
  image?: string;

  votes: Partial<VoteType> = {};

  // public only
  myVote?: {like: boolean, dislike: boolean}; // = {like: false, dislike: false};

  // 대댓글 등등 undefined 가능.
  relative?: string;
}