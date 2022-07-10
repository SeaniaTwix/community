/* eslint-disable @typescript-eslint/no-explicit-any,
                  @typescript-eslint/no-empty-function,
                  @typescript-eslint/no-unused-vars*/

import {Entity, SafeType} from 'dto-mapping';
import type {ITag} from '$lib/types/tag';

@Entity()
export class ArticleDto<TagType = Record<string, Record<string, ITag>>> {
  constructor(_obj: any) {}

  @SafeType({type: String})
  board?: string;

  @SafeType({ type: String })
  title?: string;

  @SafeType({type: String})
  content?: string;

  @SafeType({type: String})
  author?: string;

  @SafeType({type: String})
  source = '';

  // @SafeType({type: Number})
  // comments = 0;

  createdAt?: Date | number;

  @SafeType({type: Number})
  views = 0;

  //
  tags: TagType | undefined;
}