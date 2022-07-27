/* eslint-disable @typescript-eslint/no-explicit-any,
                  @typescript-eslint/no-empty-function,
                  @typescript-eslint/no-unused-vars*/

import {Entity, SafeType} from 'dto-mapping';
import type {ITag} from '$lib/types/tag';
import type {IUser} from '$lib/types/user';

export type InternalTagType = ITag[];
export type ClientToServerTagType = string[];
export type ServerToClientTagType = Record<string, number>;

@Entity()
export class ArticleDto<TagType = InternalTagType> {
  constructor(_obj: any) {}

  @SafeType({type: String})
  board?: string;

  @SafeType({ type: String })
  title?: string;

  @SafeType({type: String})
  content?: string;

  // @SafeType({type: String})
  author?: IUser;

  @SafeType({type: String})
  source = '';

  // old api: boolean
  // new api: string (image src)
  images: string | boolean = false;

  // @SafeType({type: Number})
  // comments = 0;

  createdAt?: Date | number;

  @SafeType({type: Number})
  views = 0;

  //
  tags: TagType | undefined;

  serials: { title: string, _key: string }[] = [];
}