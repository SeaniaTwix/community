/* eslint-disable @typescript-eslint/no-explicit-any,
                  @typescript-eslint/no-empty-function,
                  @typescript-eslint/no-unused-vars*/

import {Entity, SafeType} from 'dto-mapping';

@Entity()
export class CommentDto {

  constructor(_obj: unknown) {
  }

  // article id (root)
  @SafeType({type: String})
  article?: string;

  @SafeType({type: String})
  // 내용
  content?: string;

  // 대댓글 등등 undefined 가능.
  relative?: string;
}